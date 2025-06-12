# Cockpit Docker Module

A web-based interface for managing Docker containers through Cockpit, similar to the existing Podman integration.

## Features

- **Container Management**: Start, stop, remove, and monitor Docker containers
- **Image Management**: Pull, remove, and run containers from Docker images
- **Real-time Monitoring**: View container logs and system information
- **User-friendly Interface**: Web-based GUI integrated with Cockpit
- **System Information**: View Docker daemon status and system details

## Prerequisites

- Linux system with Cockpit installed
- Docker installed and running
- Node.js (for the backend service)
- User with Docker permissions

## Installation

### 1. Install Dependencies

```bash
# Install Cockpit (if not already installed)
sudo dnf install cockpit cockpit-ws  # RHEL/CentOS/Fedora
# or
sudo apt install cockpit cockpit-ws  # Ubuntu/Debian

# Install Docker (if not already installed)
sudo dnf install docker-ce docker-ce-cli containerd.io  # RHEL/CentOS/Fedora
# or
sudo apt install docker.io  # Ubuntu/Debian

# Start and enable services
sudo systemctl enable --now cockpit.socket
sudo systemctl enable --now docker

# Install Node.js (for the backend)
sudo dnf install nodejs npm  # RHEL/CentOS/Fedora
# or
sudo apt install nodejs npm  # Ubuntu/Debian
```

### 2. Create Module Directory

```bash
sudo mkdir -p /usr/share/cockpit/docker
```

### 3. Install Module Files

Copy the following files to `/usr/share/cockpit/docker/`:

- `docker-manager.js` (Backend Node.js service)
- `index.html` (Main HTML interface)
- `docker.js` (Frontend JavaScript)
- `docker.css` (Styles)
- `manifest.json` (Cockpit module manifest)

```bash
# Copy files (adjust paths as needed)
sudo cp docker-manager.js /usr/share/cockpit/docker/
sudo cp index.html /usr/share/cockpit/docker/
sudo cp docker.js /usr/share/cockpit/docker/
sudo cp docker.css /usr/share/cockpit/docker/
sudo cp manifest.json /usr/share/cockpit/docker/

# Set proper permissions
sudo chmod +x /usr/share/cockpit/docker/docker-manager.js
sudo chown -R root:root /usr/share/cockpit/docker/
```

### 4. Configure Docker Permissions

Add your user to the docker group (or ensure Cockpit can access Docker):

```bash
sudo usermod -aG docker $USER
# Log out and back in for changes to take effect
```

### 5. Restart Cockpit

```bash
sudo systemctl restart cockpit
```

## Usage

1. Open your web browser and navigate to `https://your-server:9090`
2. Log in to Cockpit
3. You should see "Docker" in the navigation menu
4. Click on "Docker" to access the Docker management interface

### Interface Overview

- **Containers Tab**: View and manage running and stopped containers
  - Start/stop containers
  - View container logs
  - Remove containers
  
- **Images Tab**: Manage Docker images
  - Pull new images from registries
  - Remove unused images
  - Run containers from images
  
- **System Tab**: View Docker system information
  - Docker version and configuration
  - Container and image statistics
  - Storage driver information

### Container Operations

- **Start Container**: Click the "Start" button next to a stopped container
- **Stop Container**: Click the "Stop" button next to a running container
- **View Logs**: Click "Logs" to view container output
- **Remove Container**: Click "Remove" to delete a container

### Image Operations

- **Pull Image**: Click "Pull Image" and enter the image name (e.g., `nginx:latest`)
- **Run Container**: Click "Run Container" or "Run" next to an image to create a new container
- **Remove Image**: Click "Remove" next to an image to delete it

### Running Containers

When creating a new container, you can specify:

- **Image**: The Docker image to use
- **Name**: Optional container name
- **Port Mapping**: Host:container port mappings (e.g., `8080:80`)
- **Volume Mounts**: Host:container volume mounts (e.g., `/host/path:/container/path`)
- **Environment Variables**: Environment variables in format `VAR=value`
- **Command**: Optional command to run in the container
- **Detached Mode**: Run container in the background (recommended)

## Troubleshooting

### Docker Service Not Running

If you see "Docker daemon is not running":

```bash
sudo systemctl start docker
sudo systemctl enable docker
```

### Permission Denied

If you get permission errors:

```bash
# Add user to docker group
sudo usermod -aG docker $USER
# Log out and back in

# Or check Docker socket permissions
sudo chmod 666 /var/run/docker.sock
```

### Module Not Appearing

If the Docker module doesn't appear in Cockpit:

```bash
# Check file permissions
ls -la /usr/share/cockpit/docker/

# Restart Cockpit
sudo systemctl restart cockpit

# Check Cockpit logs
sudo journalctl -u cockpit -f
```

### Backend Service Issues

If containers/images don't load:

```bash
# Test Docker access manually
docker ps
docker images

# Check if Node.js script is executable
ls -la /usr/share/cockpit/docker/docker-manager.js

# Test the backend script
node /usr/share/cockpit/docker/docker-manager.js
```

## Security Considerations

- This module requires Docker access, which is equivalent to root access
- Only grant access to trusted users
- Consider using Docker's user namespace remapping for additional security
- Regularly update Docker and Cockpit for security patches

## Development

To modify or extend the module:

1. Backend logic is in `docker-manager.js`
2. Frontend interface is in `index.html`, `docker.js`, and `docker.css`
3. Module configuration is in `manifest.json`

After making changes, restart Cockpit:

```bash
sudo systemctl restart cockpit
```

## License

This module is provided as-is for educational and development purposes. Ensure you comply with your organization's security policies before deploying in production environments.

## Support

This is a custom module. For issues:

1. Check Docker daemon status
2. Verify file permissions
3. Check Cockpit and system logs
4. Ensure user has proper Docker permissions