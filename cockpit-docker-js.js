/**
 * Cockpit Docker Module - Frontend JavaScript
 */

(function() {
    "use strict";

    const $ = cockpit.jQuery;
    let dockerChannel;
    let containers = [];
    let images = [];
    let systemInfo = {};

    // Initialize the module
    function init() {
        setupEventHandlers();
        setupDockerChannel();
        loadInitialData();
    }

    // Setup Docker communication channel
    function setupDockerChannel() {
        dockerChannel = cockpit.channel({
            payload: 'stream',
            spawn: ['/usr/share/cockpit/docker/docker-manager.js']
        });

        dockerChannel.addEventListener('message', handleDockerMessage);
        dockerChannel.addEventListener('close', handleDockerClose);
    }

    // Handle messages from Docker backend
    function handleDockerMessage(event, data) {
        try {
            const message = JSON.parse(data);
            
            switch (message.type) {
                case 'containers-list':
                    containers = message.data;
                    updateContainersTable();
                    break;
                case 'images-list':
                    images = message.data;
                    updateImagesTable();
                    break;
                case 'system-info':
                    systemInfo = message.data;
                    updateSystemInfo();
                    break;
                case 'container-logs':
                    showContainerLogs(message.data.logs);
                    break;
                case 'daemon-status':
                    updateDaemonStatus(message.data.running);
                    break;
                case 'error':
                    showError(message.message);
                    break;
                default:
                    console.log('Received message:', message);
            }
        } catch (error) {
            console.error('Error parsing Docker message:', error);
        }
    }

    // Handle Docker channel close
    function handleDockerClose(event, data) {
        console.error('Docker channel closed:', data);
        showError('Connection to Docker service lost');
    }

    // Setup event handlers
    function setupEventHandlers() {
        // Refresh button
        $('#refresh-btn').click(refreshData);

        // Pull image modal
        $('#pull-image-btn, #empty-pull-image').click(() => {
            $('#pull-image-modal').modal('show');
        });

        $('#pull-image-form').submit(handlePullImage);

        // Run container modal
        $('#run-container-btn, #empty-run-container').click(() => {
            $('#run-container-modal').modal('show');
        });

        $('#run-container-form').submit(handleRunContainer);

        // Tab switching
        $('a[data-toggle="tab"]').on('shown.bs.tab', function(e) {
            const target = $(e.target).attr('href');
            if (target === '#system') {
                requestSystemInfo();
            }
        });
    }

    // Load initial data
    function loadInitialData() {
        showLoading('containers');
        showLoading('images');
        requestContainers();
        requestImages();
    }

    // Send request to Docker backend
    function sendDockerRequest(action, data = {}) {
        const request = {
            action: action,
            ...data,
            timestamp: new Date().toISOString()
        };
        dockerChannel.send(JSON.stringify(request));
    }

    // Request containers list
    function requestContainers() {
        sendDockerRequest('list-containers');
    }

    // Request images list
    function requestImages() {
        sendDockerRequest('list-images');
    }

    // Request system info
    function requestSystemInfo() {
        showLoading('system');
        sendDockerRequest('get-system-info');
    }

    // Refresh all data
    function refreshData() {
        showLoading('containers');
        showLoading('images');
        requestContainers();
        requestImages();
        
        // Refresh system info if on system tab
        if ($('#system').hasClass('active')) {
            requestSystemInfo();
        }
    }

    // Show loading spinner
    function showLoading(section) {
        $(`#${section}-loading`).removeClass('hidden');
        $(`#${section}-error`).addClass('hidden');
        $(`#${section}-table, #${section}-empty, #${section}-info`).addClass('hidden');
    }

    // Hide loading spinner
    function hideLoading(section) {
        $(`#${section}-loading`).addClass('hidden');
    }

    // Show error message
    function showError(message, section = null) {
        if (section) {
            hideLoading(section);
            $(`#${section}-error`).text(message).removeClass('hidden');
        } else {
            // Show global error notification
            cockpit.notify('Docker Error', message, 'danger');
        }
    }

    // Update containers table
    function updateContainersTable() {
        hideLoading('containers');
        
        if (containers.length === 0) {
            $('#containers-empty').removeClass('hidden');
            return;
        }

        const tbody = $('#containers-table tbody');
        tbody.empty();
        
        containers.forEach(container => {
            const row = $(`
                <tr>
                    <td>${escapeHtml(container.Names || 'N/A')}</td>
                    <td>${escapeHtml(container.Image || 'N/A')}</td>
                    <td>
                        <span class="label label-${getStatusClass(container.Status)}">
                            ${escapeHtml(container.Status || 'Unknown')}
                        </span>
                    </td>
                    <td>${escapeHtml(container.Ports || 'None')}</td>
                    <td>${formatDate(container.CreatedAt)}</td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            ${getContainerActions(container)}
                        </div>
                    </td>
                </tr>
            `);
            tbody.append(row);
        });
        
        $('#containers-table').removeClass('hidden');
        setupContainerActions();
    }

    // Update images table
    function updateImagesTable() {
        hideLoading('images');
        
        if (images.length === 0) {
            $('#images-empty').removeClass('hidden');
            return;
        }

        const tbody = $('#images-table tbody');
        tbody.empty();
        
        images.forEach(image => {
            const row = $(`
                <tr>
                    <td>${escapeHtml(image.Repository || 'N/A')}</td>
                    <td>${escapeHtml(image.Tag || 'N/A')}</td>
                    <td>${escapeHtml(image.ID ? image.ID.substring(0, 12) : 'N/A')}</td>
                    <td>${formatSize(image.Size)}</td>
                    <td>${formatDate(image.CreatedAt)}</td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-default run-from-image" 
                                    data-image="${escapeHtml(image.Repository + ':' + image.Tag)}">
                                <span class="fa fa-play"></span> Run
                            </button>
                            <button class="btn btn-danger remove-image" 
                                    data-image-id="${escapeHtml(image.ID)}">
                                <span class="fa fa-trash"></span> Remove
                            </button>
                        </div>
                    </td>
                </tr>
            `);
            tbody.append(row);
        });
        
        $('#images-table').removeClass('hidden');
        setupImageActions();
    }

    // Update system information
    function updateSystemInfo() {
        hideLoading('system');
        
        if (!systemInfo.version || !systemInfo.systemInfo) {
            showError('Failed to load system information', 'system');
            return;
        }

        const version = systemInfo.version.Client || {};
        const info = systemInfo.systemInfo || {};

        // Update version info
        $('#docker-version').text(version.Version || 'N/A');
        $('#docker-api-version').text(version.ApiVersion || 'N/A');
        $('#docker-git-commit').text(version.GitCommit || 'N/A');
        $('#docker-built').text(version.BuildTime || 'N/A');

        // Update system info
        $('#system-containers').text(info.Containers || '0');
        $('#system-running').text(info.ContainersRunning || '0');
        $('#system-paused').text(info.ContainersPaused || '0');
        $('#system-stopped').text(info.ContainersStopped || '0');
        $('#system-images').text(info.Images || '0');

        // Update storage info
        $('#storage-driver').text(info.Driver || 'N/A');
        $('#docker-root-dir').text(info.DockerRootDir || 'N/A');

        $('#system-info').removeClass('hidden');
    }

    // Get status CSS class
    function getStatusClass(status) {
        if (!status) return 'default';
        const statusLower = status.toLowerCase();
        if (statusLower.includes('up') || statusLower.includes('running')) {
            return 'success';
        } else if (statusLower.includes('exited')) {
            return 'danger';
        } else if (statusLower.includes('paused')) {
            return 'warning';
        }
        return 'default';
    }

    // Get container action buttons
    function getContainerActions(container) {
        const isRunning = container.Status && container.Status.toLowerCase().includes('up');
        let actions = '';
        
        if (isRunning) {
            actions += `
                <button class="btn btn-warning stop-container" 
                        data-container-id="${escapeHtml(container.ID)}">
                    <span class="fa fa-stop"></span> Stop
                </button>
            `;
        } else {
            actions += `
                <button class="btn btn-success start-container" 
                        data-container-id="${escapeHtml(container.ID)}">
                    <span class="fa fa-play"></span> Start
                </button>
            `;
        }
        
        actions += `
            <button class="btn btn-info show-logs" 
                    data-container-id="${escapeHtml(container.ID)}">
                <span class="fa fa-file-text-o"></span> Logs
            </button>
            <button class="btn btn-danger remove-container" 
                    data-container-id="${escapeHtml(container.ID)}"
                    data-force="${!isRunning}">
                <span class="fa fa-trash"></span> Remove
            </button>
        `;
        
        return actions;
    }

    // Setup container action handlers
    function setupContainerActions() {
        $('.start-container').click(function() {
            const containerId = $(this).data('container-id');
            sendDockerRequest('start-container', { containerId });
        });

        $('.stop-container').click(function() {
            const containerId = $(this).data('container-id');
            sendDockerRequest('stop-container', { containerId });
        });

        $('.remove-container').click(function() {
            const containerId = $(this).data('container-id');
            const force = $(this).data('force');
            
            if (confirm('Are you sure you want to remove this container?')) {
                sendDockerRequest('remove-container', { containerId, force });
            }
        });

        $('.show-logs').click(function() {
            const containerId = $(this).data('container-id');
            sendDockerRequest('get-logs', { containerId, lines: 100 });
        });
    }

    // Setup image action handlers
    function setupImageActions() {
        $('.run-from-image').click(function() {
            const imageName = $(this).data('image');
            $('#container-image').val(imageName);
            $('#run-container-modal').modal('show');
        });

        $('.remove-image').click(function() {
            const imageId = $(this).data('image-id');
            
            if (confirm('Are you sure you want to remove this image?')) {
                sendDockerRequest('remove-image', { imageId, force: false });
            }
        });
    }

    // Handle pull image form submission
    function handlePullImage(event) {
        event.preventDefault();
        
        const imageName = $('#image-name').val().trim();
        if (!imageName) return;

        $('#pull-image-modal').modal('hide');
        sendDockerRequest('pull-image', { imageName });
        
        // Clear form
        $('#pull-image-form')[0].reset();
    }

    // Handle run container form submission
    function handleRunContainer(event) {
        event.preventDefault();
        
        const options = {
            image: $('#container-image').val().trim(),
            name: $('#container-name').val().trim() || null,
            detach: $('#container-detach').is(':checked'),
            ports: parseCommaSeparated($('#container-ports').val()),
            volumes: parseCommaSeparated($('#container-volumes').val()),
            environment: parseCommaSeparated($('#container-env').val()),
            command: $('#container-command').val().trim() || null
        };

        if (!options.image) return;

        $('#run-container-modal').modal('hide');
        sendDockerRequest('run-container', { options });
        
        // Clear form
        $('#run-container-form')[0].reset();
    }

    // Show container logs
    function showContainerLogs(logs) {
        $('#container-logs-content').text(logs);
        $('#container-logs-modal').modal('show');
    }

    // Update daemon status
    function updateDaemonStatus(running) {
        if (!running) {
            showError('Docker daemon is not running');
        }
    }

    // Utility functions
    function escapeHtml(text) {
        if (!text) return '';
        return $('<div>').text(text).html();
    }

    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleString();
        } catch (error) {
            return dateString;
        }
    }

    function formatSize(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    function parseCommaSeparated(value) {
        if (!value) return [];
        return value.split(',').map(item => item.trim()).filter(item => item);
    }

    // Initialize when document is ready
    $(document).ready(init);

})();