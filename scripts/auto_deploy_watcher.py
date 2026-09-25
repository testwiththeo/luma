#!/usr/bin/env python3
import http.server
import json
import os
import subprocess
import threading
import time

REPO_DIR = "/home/ubuntu/luma"
DEPLOY_SCRIPT = os.path.join(REPO_DIR, "scripts/deploy.sh")
PORT = 9876
POLL_GIT_INTERVAL = 15  # seconds
WATCH_LOCAL_INTERVAL = 2  # seconds
DEBOUNCE_DELAY = 3.0  # seconds

WATCH_DIRS = [
    os.path.join(REPO_DIR, "apps"),
    os.path.join(REPO_DIR, "packages"),
]

IGNORE_PARTS = [
    "node_modules",
    "/dist",
    "/.git",
    ".log",
    ".db",
    ".sqlite",
    ".tmp",
]

deploy_lock = threading.Lock()
pending_trigger = threading.Event()
latest_reason = "init"
is_deploying = False
last_deploy_time = None
last_deploy_status = "none"


def run_deployment(reason: str):
    global is_deploying, last_deploy_time, last_deploy_status
    with deploy_lock:
        is_deploying = True
        print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Starting deployment (trigger: {reason})...")
        try:
            res = subprocess.run(
                ["bash", DEPLOY_SCRIPT, reason],
                cwd=REPO_DIR,
                capture_output=True,
                text=True,
                timeout=300,
            )
            if res.returncode == 0:
                last_deploy_status = "success"
                print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Deployment succeeded.")
            else:
                last_deploy_status = f"failed (exit {res.returncode})"
                print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Deployment failed: {res.stderr[:200]}")
        except Exception as e:
            last_deploy_status = f"error: {e}"
            print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Deployment error: {e}")
        finally:
            last_deploy_time = time.strftime('%Y-%m-%d %H:%M:%S')
            is_deploying = False


def trigger_deploy(reason: str):
    global latest_reason
    latest_reason = reason
    pending_trigger.set()


def deploy_worker():
    while True:
        pending_trigger.wait()
        pending_trigger.clear()
        time.sleep(DEBOUNCE_DELAY)
        # Clear any redundant events that arrived during debounce
        pending_trigger.clear()
        run_deployment(latest_reason)


def git_poll_loop():
    while True:
        time.sleep(POLL_GIT_INTERVAL)
        try:
            # Check if remote main has new commits
            subprocess.run(
                ["git", "fetch", "origin", "main"],
                cwd=REPO_DIR,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                timeout=20,
            )
            local_hash = (
                subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=REPO_DIR)
                .decode()
                .strip()
            )
            remote_hash = (
                subprocess.check_output(["git", "rev-parse", "origin/main"], cwd=REPO_DIR)
                .decode()
                .strip()
            )
            if local_hash != remote_hash:
                print(f"Git remote updated: {local_hash} -> {remote_hash}")
                trigger_deploy("git_remote_push")
        except Exception as e:
            # Non-blocking network or git error
            pass


def get_local_snapshot():
    snapshot = {}
    for watch_dir in WATCH_DIRS:
        if not os.path.exists(watch_dir):
            continue
        for root, dirs, files in os.walk(watch_dir):
            # Skip ignored directories in-place
            dirs[:] = [d for d in dirs if not any(ign in os.path.join(root, d) for ign in IGNORE_PARTS)]
            for f in files:
                filepath = os.path.join(root, f)
                if any(ign in filepath for ign in IGNORE_PARTS):
                    continue
                try:
                    snapshot[filepath] = os.path.getmtime(filepath)
                except OSError:
                    pass
    return snapshot


def local_watch_loop():
    last_snapshot = get_local_snapshot()
    while True:
        time.sleep(WATCH_LOCAL_INTERVAL)
        try:
            current_snapshot = get_local_snapshot()
            if current_snapshot != last_snapshot:
                # Detect what changed
                changed = []
                for path, mtime in current_snapshot.items():
                    if path not in last_snapshot or last_snapshot[path] != mtime:
                        changed.append(os.path.basename(path))
                last_snapshot = current_snapshot
                if changed:
                    print(f"Local files changed: {changed[:5]}")
                    trigger_deploy(f"local_files_changed: {','.join(changed[:3])}")
        except Exception as e:
            pass


class WebhookHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        resp = {
            "status": "active",
            "is_deploying": is_deploying,
            "last_deploy_time": last_deploy_time,
            "last_deploy_status": last_deploy_status,
            "latest_trigger": latest_reason,
        }
        self.wfile.write(json.dumps(resp, indent=2).encode())

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length) if content_length > 0 else b""
        
        event_name = self.headers.get("X-GitHub-Event", "generic_webhook")
        print(f"Webhook POST received ({event_name})")
        trigger_deploy(f"webhook_{event_name}")

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        resp = {
            "status": "triggered",
            "message": "Deployment triggered successfully",
            "event": event_name,
        }
        self.wfile.write(json.dumps(resp).encode())

    def log_message(self, format, *args):
        # Suppress verbose console spam
        return


def main():
    print(f"Starting Luma Auto-Deploy Watcher on 127.0.0.1:{PORT}...")
    
    # Thread 1: Deployment worker
    t_worker = threading.Thread(target=deploy_worker, daemon=True)
    t_worker.start()

    # Thread 2: Git remote poller
    t_git = threading.Thread(target=git_poll_loop, daemon=True)
    t_git.start()

    # Thread 3: Local file watcher
    t_local = threading.Thread(target=local_watch_loop, daemon=True)
    t_local.start()

    # HTTP Webhook Server (main thread)
    server = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), WebhookHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("Stopping watcher...")
        server.server_close()


if __name__ == "__main__":
    main()
