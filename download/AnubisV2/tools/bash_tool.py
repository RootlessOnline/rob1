"""
Bash Tool - Execute Terminal Commands

This gives Anubis the ability to:
- Run any terminal/bash command
- Navigate filesystem
- Install packages
- Run scripts and applications
- Manage files
- Start background services

Security: Commands run in the user's environment with user permissions.
"""

import os
import sys
import subprocess
import shlex
import asyncio
import signal
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from datetime import datetime
import threading
import time


@dataclass
class CommandResult:
    """Result of a bash command"""
    success: bool
    command: str
    stdout: str
    stderr: str
    return_code: int
    execution_time: float
    pid: Optional[int] = None


class BashTool:
    """
    Execute bash commands safely
    """
    
    def __init__(self, working_dir: str = None, timeout: int = 300):
        self.working_dir = working_dir or os.path.expanduser("~")
        self.timeout = timeout
        self.running_processes: Dict[str, subprocess.Popen] = {}
        
    def execute(self, command: str, cwd: str = None, 
                timeout: int = None, env: Dict = None,
                capture_output: bool = True) -> CommandResult:
        """
        Execute a bash command
        
        Args:
            command: The command to run
            cwd: Working directory (default: self.working_dir)
            timeout: Timeout in seconds (default: self.timeout)
            env: Environment variables to add
            capture_output: Whether to capture stdout/stderr
        
        Returns:
            CommandResult with output and status
        """
        start_time = time.time()
        cwd = cwd or self.working_dir
        timeout = timeout or self.timeout
        
        # Prepare environment
        cmd_env = os.environ.copy()
        if env:
            cmd_env.update(env)
        
        # Ensure working directory exists
        os.makedirs(cwd, exist_ok=True)
        
        try:
            # Run the command
            result = subprocess.run(
                command,
                shell=True,
                cwd=cwd,
                env=cmd_env,
                capture_output=capture_output,
                text=True,
                timeout=timeout
            )
            
            execution_time = time.time() - start_time
            
            return CommandResult(
                success=result.returncode == 0,
                command=command,
                stdout=result.stdout or "",
                stderr=result.stderr or "",
                return_code=result.returncode,
                execution_time=execution_time
            )
            
        except subprocess.TimeoutExpired:
            execution_time = time.time() - start_time
            return CommandResult(
                success=False,
                command=command,
                stdout="",
                stderr=f"Command timed out after {timeout} seconds",
                return_code=-1,
                execution_time=execution_time
            )
            
        except Exception as e:
            execution_time = time.time() - start_time
            return CommandResult(
                success=False,
                command=command,
                stdout="",
                stderr=str(e),
                return_code=-1,
                execution_time=execution_time
            )
    
    def execute_async(self, command: str, cwd: str = None, 
                      env: Dict = None, name: str = None) -> Tuple[str, int]:
        """
        Execute a command in the background
        
        Returns:
            Tuple of (process_name, pid)
        """
        cwd = cwd or self.working_dir
        name = name or f"process_{int(time.time())}"
        
        cmd_env = os.environ.copy()
        if env:
            cmd_env.update(env)
        
        os.makedirs(cwd, exist_ok=True)
        
        process = subprocess.Popen(
            command,
            shell=True,
            cwd=cwd,
            env=cmd_env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            preexec_fn=os.setsid  # Create new process group for easy killing
        )
        
        self.running_processes[name] = process
        
        return name, process.pid
    
    def stop_process(self, name: str) -> bool:
        """Stop a running background process"""
        if name in self.running_processes:
            process = self.running_processes[name]
            try:
                os.killpg(os.getpgid(process.pid), signal.SIGTERM)
                process.wait(timeout=5)
            except:
                try:
                    os.killpg(os.getpgid(process.pid), signal.SIGKILL)
                except:
                    pass
            del self.running_processes[name]
            return True
        return False
    
    def list_processes(self) -> List[Dict]:
        """List all running background processes"""
        processes = []
        for name, process in self.running_processes.items():
            processes.append({
                "name": name,
                "pid": process.pid,
                "running": process.poll() is None
            })
        return processes
    
    def get_process_output(self, name: str) -> Tuple[str, str]:
        """Get stdout and stderr from a background process"""
        if name in self.running_processes:
            process = self.running_processes[name]
            # Non-blocking read
            stdout = ""
            stderr = ""
            try:
                import select
                if process.stdout and select.select([process.stdout], [], [], 0)[0]:
                    stdout = process.stdout.read()
                if process.stderr and select.select([process.stderr], [], [], 0)[0]:
                    stderr = process.stderr.read()
            except:
                pass
            return stdout, stderr
        return "", ""
    
    # Convenience methods
    
    def ls(self, path: str = ".") -> CommandResult:
        """List directory contents"""
        return self.execute(f"ls -la {path}")
    
    def cd(self, path: str) -> CommandResult:
        """Change working directory"""
        full_path = os.path.abspath(os.path.join(self.working_dir, path))
        if os.path.isdir(full_path):
            self.working_dir = full_path
            return CommandResult(
                success=True,
                command=f"cd {path}",
                stdout=full_path,
                stderr="",
                return_code=0,
                execution_time=0
            )
        return CommandResult(
            success=False,
            command=f"cd {path}",
            stdout="",
            stderr=f"Directory not found: {full_path}",
            return_code=1,
            execution_time=0
        )
    
    def mkdir(self, path: str) -> CommandResult:
        """Create directory"""
        return self.execute(f"mkdir -p {path}")
    
    def rm(self, path: str) -> CommandResult:
        """Remove file or directory"""
        return self.execute(f"rm -rf {path}")
    
    def cp(self, source: str, dest: str) -> CommandResult:
        """Copy file or directory"""
        return self.execute(f"cp -r {source} {dest}")
    
    def mv(self, source: str, dest: str) -> CommandResult:
        """Move file or directory"""
        return self.execute(f"mv {source} {dest}")
    
    def cat(self, path: str) -> CommandResult:
        """Read file contents"""
        return self.execute(f"cat {path}")
    
    def write(self, path: str, content: str) -> CommandResult:
        """Write content to file"""
        escaped_content = content.replace("'", "'\\''")
        return self.execute(f"echo '{escaped_content}' > {path}")
    
    def pip_install(self, package: str) -> CommandResult:
        """Install a Python package"""
        return self.execute(f"pip install {package}")
    
    def npm_install(self, package: str = "", cwd: str = None) -> CommandResult:
        """Install an npm package"""
        cmd = f"npm install {package}".strip()
        return self.execute(cmd, cwd=cwd, timeout=600)
    
    def git_clone(self, repo: str, cwd: str = None) -> CommandResult:
        """Clone a git repository"""
        return self.execute(f"git clone {repo}", cwd=cwd, timeout=300)
    
    def git_status(self, cwd: str = None) -> CommandResult:
        """Check git status"""
        return self.execute("git status", cwd=cwd)
    
    def kill_port(self, port: int) -> CommandResult:
        """Kill process running on a port"""
        return self.execute(f"fuser -k {port}/tcp 2>/dev/null || true")
    
    def check_port(self, port: int) -> bool:
        """Check if a port is in use"""
        result = self.execute(f"lsof -i:{port}")
        return bool(result.stdout.strip())


class BashToolWrapper:
    """
    Wrapper that integrates BashTool with Anubis's tool system
    """
    
    def __init__(self):
        self.bash = BashTool()
    
    def run_command(self, command: str) -> str:
        """Run a bash command and return formatted result"""
        result = self.bash.execute(command)
        
        output = []
        output.append(f"$ {command}")
        output.append(f"[Exit code: {result.return_code}]")
        
        if result.stdout:
            output.append(f"\n{result.stdout}")
        if result.stderr:
            output.append(f"\n[stderr]\n{result.stderr}")
        
        return "\n".join(output)
    
    def start_service(self, command: str, name: str) -> str:
        """Start a background service"""
        process_name, pid = self.bash.execute_async(command, name=name)
        return f"Started service '{process_name}' with PID {pid}"
    
    def stop_service(self, name: str) -> str:
        """Stop a background service"""
        if self.bash.stop_process(name):
            return f"Stopped service '{name}'"
        return f"Service '{name}' not found"
    
    def list_services(self) -> str:
        """List all running services"""
        processes = self.bash.list_processes()
        if not processes:
            return "No background services running"
        
        lines = ["Running services:"]
        for p in processes:
            status = "running" if p["running"] else "stopped"
            lines.append(f"  - {p['name']}: PID {p['pid']} ({status})")
        
        return "\n".join(lines)


# Tool definitions for the tool registry
TOOLS = [
    {
        "name": "bash",
        "description": "Execute a bash/terminal command. Use for file operations, installing packages, running scripts, etc.",
        "function": "run_bash_command",
        "parameters": {
            "command": {"type": "string", "description": "The bash command to execute"}
        },
        "category": "system"
    },
    {
        "name": "start_service",
        "description": "Start a command as a background service",
        "function": "start_background_service",
        "parameters": {
            "command": {"type": "string", "description": "Command to run in background"},
            "name": {"type": "string", "description": "Name for the service"}
        },
        "category": "system"
    },
    {
        "name": "stop_service",
        "description": "Stop a background service",
        "function": "stop_background_service",
        "parameters": {
            "name": {"type": "string", "description": "Name of the service to stop"}
        },
        "category": "system"
    },
    {
        "name": "list_services",
        "description": "List all running background services",
        "function": "list_background_services",
        "parameters": {},
        "category": "system"
    }
]


# Global instance
_bash_tool_wrapper = None


def get_bash_tool() -> BashToolWrapper:
    """Get the global bash tool instance"""
    global _bash_tool_wrapper
    if _bash_tool_wrapper is None:
        _bash_tool_wrapper = BashToolWrapper()
    return _bash_tool_wrapper


# Functions for tool registry
def run_bash_command(command: str) -> str:
    """Execute a bash command"""
    return get_bash_tool().run_command(command)


def start_background_service(command: str, name: str) -> str:
    """Start a background service"""
    return get_bash_tool().start_service(command, name)


def stop_background_service(name: str) -> str:
    """Stop a background service"""
    return get_bash_tool().stop_service(name)


def list_background_services() -> str:
    """List all running background services"""
    return get_bash_tool().list_services()


if __name__ == "__main__":
    # Test the bash tool
    bash = BashTool()
    
    print("Testing Bash Tool:")
    print("-" * 40)
    
    # Test ls
    result = bash.ls()
    print(f"ls:\n{result.stdout[:500]}...")
    
    # Test pwd
    result = bash.execute("pwd")
    print(f"\npwd: {result.stdout.strip()}")
    
    # Test echo
    result = bash.execute("echo 'Hello from Anubis!'")
    print(f"\necho: {result.stdout.strip()}")
