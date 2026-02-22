"""
Service Manager - Run and manage background services

This allows Anubis to:
- Start Telegram bots that run 24/7
- Keep services running even after Anubis closes
- Auto-restart crashed services
- Check service status
- View service logs
"""

import os
import sys
import json
import subprocess
import signal
import time
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field, asdict
from pathlib import Path
import threading


@dataclass
class Service:
    """A background service"""
    name: str
    platform: str
    command: str
    pid: Optional[int] = None
    status: str = "stopped"  # stopped, running, crashed
    started_at: Optional[str] = None
    log_file: str = ""
    auto_restart: bool = True
    restart_count: int = 0
    max_restarts: int = 5


class ServiceManager:
    """
    Manages background services for Anubis
    """
    
    def __init__(self, services_dir: str = None):
        self.services_dir = services_dir or os.path.join(
            os.path.dirname(os.path.dirname(__file__)), "services"
        )
        os.makedirs(self.services_dir, exist_ok=True)
        
        self.services_file = os.path.join(self.services_dir, "services.json")
        self.logs_dir = os.path.join(self.services_dir, "logs")
        os.makedirs(self.logs_dir, exist_ok=True)
        
        self.services: Dict[str, Service] = {}
        self.processes: Dict[str, subprocess.Popen] = {}
        
        self._load_services()
    
    def _load_services(self):
        """Load saved services"""
        if os.path.exists(self.services_file):
            try:
                with open(self.services_file, 'r') as f:
                    data = json.load(f)
                    for name, svc_data in data.get("services", {}).items():
                        self.services[name] = Service(
                            name=svc_data.get("name", name),
                            platform=svc_data.get("platform", "unknown"),
                            command=svc_data.get("command", ""),
                            pid=svc_data.get("pid"),
                            status="stopped",  # Always start as stopped
                            started_at=svc_data.get("started_at"),
                            log_file=svc_data.get("log_file", ""),
                            auto_restart=svc_data.get("auto_restart", True),
                            restart_count=0
                        )
            except Exception as e:
                print(f"Error loading services: {e}")
    
    def _save_services(self):
        """Save services to disk"""
        data = {
            "services": {
                name: {
                    "name": svc.name,
                    "platform": svc.platform,
                    "command": svc.command,
                    "pid": svc.pid,
                    "started_at": svc.started_at,
                    "log_file": svc.log_file,
                    "auto_restart": svc.auto_restart
                }
                for name, svc in self.services.items()
            },
            "last_saved": datetime.now().isoformat()
        }
        with open(self.services_file, 'w') as f:
            json.dump(data, f, indent=2)
    
    def create_service(self, name: str, platform: str, command: str,
                       auto_restart: bool = True) -> Service:
        """Create a new service"""
        log_file = os.path.join(self.logs_dir, f"{name}.log")
        
        service = Service(
            name=name,
            platform=platform,
            command=command,
            log_file=log_file,
            auto_restart=auto_restart
        )
        
        self.services[name] = service
        self._save_services()
        
        return service
    
    def start_service(self, name: str) -> Dict[str, Any]:
        """Start a service"""
        if name not in self.services:
            return {"success": False, "error": f"Service '{name}' not found"}
        
        service = self.services[name]
        
        # Check if already running
        if name in self.processes and self.processes[name].poll() is None:
            return {"success": False, "error": f"Service '{name}' is already running"}
        
        try:
            # Open log file
            log_path = service.log_file or os.path.join(self.logs_dir, f"{name}.log")
            log_file = open(log_path, 'a')
            
            # Start the process
            process = subprocess.Popen(
                service.command,
                shell=True,
                stdout=log_file,
                stderr=subprocess.STDOUT,
                preexec_fn=os.setsid,
                cwd=os.path.dirname(os.path.dirname(__file__))
            )
            
            self.processes[name] = process
            service.pid = process.pid
            service.status = "running"
            service.started_at = datetime.now().isoformat()
            
            self._save_services()
            
            return {
                "success": True,
                "pid": process.pid,
                "message": f"Service '{name}' started with PID {process.pid}"
            }
            
        except Exception as e:
            service.status = "crashed"
            return {"success": False, "error": str(e)}
    
    def stop_service(self, name: str) -> Dict[str, Any]:
        """Stop a service"""
        if name not in self.services:
            return {"success": False, "error": f"Service '{name}' not found"}
        
        service = self.services[name]
        
        if name not in self.processes:
            service.status = "stopped"
            self._save_services()
            return {"success": True, "message": f"Service '{name}' was not running"}
        
        process = self.processes[name]
        
        try:
            # Try graceful termination first
            os.killpg(os.getpgid(process.pid), signal.SIGTERM)
            
            # Wait a bit
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                # Force kill
                os.killpg(os.getpgid(process.pid), signal.SIGKILL)
                process.wait()
            
            service.status = "stopped"
            service.pid = None
            del self.processes[name]
            
            self._save_services()
            
            return {"success": True, "message": f"Service '{name}' stopped"}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def restart_service(self, name: str) -> Dict[str, Any]:
        """Restart a service"""
        self.stop_service(name)
        time.sleep(1)
        return self.start_service(name)
    
    def get_service_status(self, name: str) -> Dict[str, Any]:
        """Get status of a service"""
        if name not in self.services:
            return {"exists": False}
        
        service = self.services[name]
        
        # Check if actually running
        if name in self.processes:
            process = self.processes[name]
            if process.poll() is None:
                service.status = "running"
            else:
                service.status = "crashed"
        else:
            service.status = "stopped"
        
        return {
            "exists": True,
            "name": service.name,
            "platform": service.platform,
            "status": service.status,
            "pid": service.pid,
            "started_at": service.started_at,
            "restart_count": service.restart_count,
            "log_file": service.log_file
        }
    
    def list_services(self) -> List[Dict]:
        """List all services"""
        result = []
        for name in self.services:
            result.append(self.get_service_status(name))
        return result
    
    def get_logs(self, name: str, lines: int = 50) -> str:
        """Get recent log entries"""
        if name not in self.services:
            return f"Service '{name}' not found"
        
        service = self.services[name]
        log_file = service.log_file
        
        if not log_file or not os.path.exists(log_file):
            return "No logs available"
        
        try:
            with open(log_file, 'r') as f:
                all_lines = f.readlines()
                recent = all_lines[-lines:]
                return "".join(recent)
        except Exception as e:
            return f"Error reading logs: {e}"
    
    def start_all(self) -> Dict[str, Dict]:
        """Start all registered services"""
        results = {}
        for name in self.services:
            results[name] = self.start_service(name)
        return results
    
    def stop_all(self) -> Dict[str, Dict]:
        """Stop all running services"""
        results = {}
        for name in list(self.processes.keys()):
            results[name] = self.stop_service(name)
        return results
    
    def delete_service(self, name: str) -> bool:
        """Delete a service"""
        if name in self.processes:
            self.stop_service(name)
        
        if name in self.services:
            del self.services[name]
            self._save_services()
            return True
        
        return False


# Singleton
_service_manager = None


def get_service_manager() -> ServiceManager:
    """Get the global service manager"""
    global _service_manager
    if _service_manager is None:
        _service_manager = ServiceManager()
    return _service_manager
