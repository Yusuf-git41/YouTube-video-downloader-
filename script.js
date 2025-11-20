class YouTubeDownloader {
    constructor() {
        this.videoInfo = null;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        document.getElementById('getInfoBtn').addEventListener('click', () => this.getVideoInfo());
        document.getElementById('downloadBtn').addEventListener('click', () => this.downloadVideo());
        document.getElementById('videoUrl').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.getVideoInfo();
            }
        });
    }

    async getVideoInfo() {
        const videoUrl = document.getElementById('videoUrl').value.trim();
        
        if (!videoUrl) {
            this.showError('Please enter a YouTube URL');
            return;
        }

        this.showLoading(true);
        this.hideError();
        this.hideVideoInfo();

        try {
            const response = await fetch(`/video-info?url=${encodeURIComponent(videoUrl)}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to get video information');
            }

            this.videoInfo = data;
            this.displayVideoInfo(data);
            
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.showLoading(false);
        }
    }

    displayVideoInfo(info) {
        // Update video details
        document.getElementById('thumbnail').src = info.thumbnail;
        document.getElementById('videoTitle').textContent = info.title;
        document.getElementById('videoAuthor').textContent = `By: ${info.author}`;
        document.getElementById('videoDuration').textContent = `Duration: ${this.formatDuration(info.duration)}`;

        // Populate quality options
        const qualitySelect = document.getElementById('qualitySelect');
        qualitySelect.innerHTML = '';

        // Group formats by quality
        const qualityGroups = {};
        info.formats.forEach(format => {
            const key = format.quality;
            if (!qualityGroups[key]) {
                qualityGroups[key] = format;
            }
        });

        // Add options to select
        Object.values(qualityGroups).forEach(format => {
            const option = document.createElement('option');
            option.value = format.itag;
            option.textContent = `${format.quality} (${format.container}) - ${this.formatFileSize(format.contentLength)}`;
            qualitySelect.appendChild(option);
        });

        // Enable download button
        document.getElementById('downloadBtn').disabled = false;

        // Show video info section
        this.showVideoInfo();
    }

    downloadVideo() {
        if (!this.videoInfo) return;

        const videoUrl = document.getElementById('videoUrl').value.trim();
        const qualitySelect = document.getElementById('qualitySelect');
        const selectedItag = qualitySelect.value;

        if (!selectedItag) {
            this.showError('Please select a quality option');
            return;
        }

        // Open download in new tab
        const downloadUrl = `/download-progressive?url=${encodeURIComponent(videoUrl)}&itag=${selectedItag}`;
        window.open(downloadUrl, '_blank');
    }

    formatDuration(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    formatFileSize(bytes) {
        if (!bytes) return 'Unknown size';
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    showLoading(show) {
        document.getElementById('loading').classList.toggle('hidden', !show);
    }

    showVideoInfo() {
        document.getElementById('videoInfo').classList.remove('hidden');
    }

    hideVideoInfo() {
        document.getElementById('videoInfo').classList.add('hidden');
    }

    showError(message) {
        const errorElement = document.getElementById('error');
        const errorMessage = document.getElementById('errorMessage');
        errorMessage.textContent = message;
        errorElement.classList.remove('hidden');
    }

    hideError() {
        document.getElementById('error').classList.add('hidden');
    }
}

// Initialize the downloader when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new YouTubeDownloader();
});