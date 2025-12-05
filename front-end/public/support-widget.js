/**
 * Production-Grade Embeddable Support Ticket Widget
 * 
 * Features:
 * - File attachment support (up to 5 files, 10MB each)
 * - View tickets by email
 * - Production-level error handling
 * - Modern, responsive design with system fonts
 * - Accessible and user-friendly.
 * 
 * Usage:
 * <script src="https://your-domain.com/support-widget.js"></script>
 * <script>
 *   SupportWidget.init({
 *     apiUrl: 'https://your-api-domain.com/api/public/customer-support',
 *     apiKey: 'your-api-key-here', // Optional
 *     buttonText: 'Contact Support',
 *     position: 'bottom-right' // bottom-right, bottom-left, top-right, top-left
 *   });
 * </script>
 */

(function(window, document) {
  'use strict';

  const SupportWidget = {
    config: {
      apiUrl: '',
      apiKey: null,
      buttonText: 'Contact Support',
      position: 'bottom-right',
      zIndex: 9999
    },

    isOpen: false,
    currentView: 'form', // 'form' or 'tickets'
    selectedFiles: [],
    uploadedFileUrls: [], // Store uploaded file URLs
    uploadedFilePaths: [], // Store uploaded file paths for deletion
    uploadedFileMetadata: [], // Store file metadata (name, size, type)
    ticketId: null, // Store ticket ID from first file upload (UUID)

    /**
     * Initialize the widget
     */
    init: function(options) {
      if (typeof options !== 'object') {
        console.error('SupportWidget: Options must be an object');
        return;
      }

      this.config = Object.assign({}, this.config, options);

      if (!this.config.apiUrl) {
        console.error('SupportWidget: apiUrl is required');
        return;
      }

      this.createButton();
      this.createModal();
      this.injectStyles();
      console.log('✅ Support Widget initialized');
    },

    /**
     * Create floating button
     */
    createButton: function() {
      const button = document.createElement('button');
      button.id = 'support-widget-button';
      button.setAttribute('aria-label', this.config.buttonText);
      button.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <span>${this.config.buttonText}</span>
      `;
      button.className = `support-widget-btn support-widget-btn-${this.config.position}`;
      button.onclick = () => this.toggleModal();
      document.body.appendChild(button);
    },

    /**
     * Create modal with form and ticket viewer
     */
    createModal: function() {
      const modal = document.createElement('div');
      modal.id = 'support-widget-modal';
      modal.className = 'support-widget-modal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-labelledby', 'support-widget-title');
      modal.innerHTML = `
        <div class="support-widget-overlay" onclick="SupportWidget.closeModal()"></div>
        <div class="support-widget-content">
          <div class="support-widget-header">
            <h2 id="support-widget-title">Contact Support</h2>
            <button class="support-widget-close" onclick="SupportWidget.closeModal()" aria-label="Close">&times;</button>
          </div>
          <div class="support-widget-body">
            <!-- Form View -->
            <div id="support-widget-form-view" class="support-widget-view">
              <form id="support-widget-form" class="support-widget-form">
                <div class="support-widget-field">
                  <label for="support-name">Name *</label>
                  <input type="text" id="support-name" name="name" required autocomplete="name">
                </div>
                <div class="support-widget-field">
                  <label for="support-email">Email *</label>
                  <input type="email" id="support-email" name="email" required autocomplete="email">
                </div>
                <div class="support-widget-field">
                  <label for="support-subject">Subject *</label>
                  <input type="text" id="support-subject" name="subject" required maxlength="255">
                  <div class="support-widget-char-count">
                    <span id="support-subject-count">0</span>/255 characters
                  </div>
                </div>
                <div class="support-widget-field">
                  <label for="support-category">Category</label>
                  <select id="support-category" name="category">
                    <option value="general">General</option>
                    <option value="technical">Technical</option>
                    <option value="billing">Billing</option>
                    <option value="feature_request">Feature Request</option>
                    <option value="bug_report">Bug Report</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div class="support-widget-field">
                  <label for="support-message">Message *</label>
                  <textarea id="support-message" name="message" rows="5" required placeholder="Please describe your issue in detail..." maxlength="5000"></textarea>
                  <div class="support-widget-char-count">
                    <span id="support-message-count">0</span>/5000 characters
                  </div>
                </div>
                <div class="support-widget-field">
                  <label for="support-priority">Priority</label>
                  <select id="support-priority" name="priority">
                    <option value="low">Low</option>
                    <option value="medium" selected>Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div class="support-widget-field">
                  <label>Attachments (Optional, max 5 files, 10MB each)</label>
                  <div class="support-widget-file-upload">
                    <input type="file" id="support-files" name="files" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv" style="display: none;">
                    <button type="button" class="support-widget-file-btn" onclick="document.getElementById('support-files').click()">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                      </svg>
                      Choose Files
                    </button>
                    <div id="support-widget-file-list" class="support-widget-file-list"></div>
                  </div>
                </div>
                <div id="support-widget-message" class="support-widget-message"></div>
                <div class="support-widget-actions">
                  <button type="button" onclick="SupportWidget.showTicketsView()">View My Tickets</button>
                  <button type="button" onclick="SupportWidget.closeModal()">Cancel</button>
                  <button type="submit" id="support-widget-submit">Submit Ticket</button>
                </div>
              </form>
            </div>
            <!-- Tickets View -->
            <div id="support-widget-tickets-view" class="support-widget-view" style="display: none;">
              <div class="support-widget-tickets-header">
                <h3>My Support Tickets</h3>
                <button type="button" onclick="SupportWidget.showFormView()" class="support-widget-back-btn">← New Ticket</button>
              </div>
              <div class="support-widget-tickets-search">
                <input type="email" id="support-tickets-email" placeholder="Enter your email address" required>
                <button type="button" onclick="SupportWidget.loadTickets()">View Tickets</button>
              </div>
              <div id="support-widget-tickets-list" class="support-widget-tickets-list"></div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      // Handle form submission
      const form = document.getElementById('support-widget-form');
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.submitTicket();
      });

      // Add real-time validation on blur
      const fields = ['name', 'email', 'subject', 'message'];
      fields.forEach(fieldName => {
        const field = document.getElementById(`support-${fieldName}`);
        if (field) {
          field.addEventListener('blur', () => {
            this.validateField(fieldName);
          });
          field.addEventListener('input', () => {
            // Clear error on input
            if (field.classList.contains('support-widget-field-error')) {
              const errorDiv = field.parentElement.querySelector('.support-widget-field-error-message');
              if (errorDiv) {
                errorDiv.remove();
                field.classList.remove('support-widget-field-error');
              }
            }
            // Update character count
            this.updateCharCount(fieldName);
          });
        }
      });

      // Initialize character counts
      this.updateCharCount('subject');
      this.updateCharCount('message');

      // Handle file selection
      const fileInput = document.getElementById('support-files');
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          this.handleFileSelection(e.target.files);
        }
        // Reset input to allow selecting same file again
        e.target.value = '';
      });
    },

    /**
     * Handle file selection and upload immediately
     */
    handleFileSelection: function(files) {
      const newFiles = Array.from(files).slice(0, 5); // Max 5 files
      const fileList = document.getElementById('support-widget-file-list');

      if (newFiles.length === 0) return;

      // Validate and upload each file
      newFiles.forEach((file, index) => {
        if (file.size > 10 * 1024 * 1024) {
          this.showError(`File "${file.name}" exceeds 10MB limit`);
          return;
        }

        // Add file to selected files
        const fileIndex = this.selectedFiles.length;
        this.selectedFiles.push(file);
        this.uploadedFileUrls.push(null); // Placeholder for URL
        this.uploadedFilePaths.push(null); // Placeholder for path
        this.uploadedFileMetadata.push({
          name: file.name,
          size: file.size,
          type: file.type
        }); // Store file metadata

        // Create file item with upload status
        const fileItem = document.createElement('div');
        fileItem.id = `support-file-item-${fileIndex}`;
        fileItem.className = 'support-widget-file-item';
        fileItem.innerHTML = `
          <div class="support-widget-file-info">
            <span class="support-widget-file-name">${file.name}</span>
            <span class="support-widget-file-size">${this.formatFileSize(file.size)}</span>
          </div>
          <div class="support-widget-file-status">
            <span class="support-widget-upload-status" id="support-upload-status-${fileIndex}">Uploading...</span>
            <div class="support-widget-upload-progress" id="support-upload-progress-${fileIndex}">
              <div class="support-widget-progress-bar"></div>
            </div>
          </div>
          <button type="button" class="support-widget-file-remove" onclick="SupportWidget.removeFile(${fileIndex})" aria-label="Remove file" style="display: none;">&times;</button>
        `;
        fileList.appendChild(fileItem);

        // Upload file immediately
        this.uploadFile(file, fileIndex);
      });
    },

    /**
     * Upload file to bucket and get URL
     */
    uploadFile: function(file, fileIndex) {
      const statusElement = document.getElementById(`support-upload-status-${fileIndex}`);
      const progressElement = document.getElementById(`support-upload-progress-${fileIndex}`);
      const progressBar = progressElement.querySelector('.support-widget-progress-bar');
      const fileItem = document.getElementById(`support-file-item-${fileIndex}`);
      const removeBtn = fileItem.querySelector('.support-widget-file-remove');

      const formData = new FormData();
      formData.append('file', file);

      // Create XMLHttpRequest for upload progress
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          progressBar.style.width = percentComplete + '%';
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.success && response.data.file_url) {
              // Store the URL and path
              // Prefer public URL if available (more reliable)
              const fileUrl = response.data.file_url_public || response.data.file_url;
              this.uploadedFileUrls[fileIndex] = fileUrl;
              this.uploadedFilePaths[fileIndex] = response.data.file_path;
              
              // Update metadata with file_name from response if available
              if (response.data.file_name && this.uploadedFileMetadata[fileIndex]) {
                this.uploadedFileMetadata[fileIndex].name = response.data.file_name;
              }
              if (response.data.file_size && this.uploadedFileMetadata[fileIndex]) {
                this.uploadedFileMetadata[fileIndex].size = response.data.file_size;
              }
              if (response.data.file_type && this.uploadedFileMetadata[fileIndex]) {
                this.uploadedFileMetadata[fileIndex].type = response.data.file_type;
              }
              
              // Store ticket_id from first file upload (all files from same upload share same ticket_id)
              if (response.data.ticket_id && !this.ticketId) {
                this.ticketId = response.data.ticket_id;
              }
              
              // Update UI to show success
              statusElement.textContent = 'Uploaded ✓';
              statusElement.className = 'support-widget-upload-status support-widget-upload-success';
              progressBar.style.width = '100%';
              progressBar.className = 'support-widget-progress-bar support-widget-progress-complete';
              removeBtn.style.display = 'flex';
              
              // Hide progress bar after a moment
              setTimeout(() => {
                progressElement.style.display = 'none';
              }, 1000);
            } else {
              throw new Error(response.error?.message || 'Upload failed');
            }
          } catch (error) {
            this.handleUploadError(fileIndex, error.message || 'Failed to parse response');
          }
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            this.handleUploadError(fileIndex, error.error?.message || 'Upload failed');
          } catch (e) {
            this.handleUploadError(fileIndex, 'Upload failed');
          }
        }
      });

      xhr.addEventListener('error', () => {
        this.handleUploadError(fileIndex, 'Network error during upload');
      });

      xhr.addEventListener('abort', () => {
        this.handleUploadError(fileIndex, 'Upload cancelled');
      });

      // Start upload
      xhr.open('POST', this.config.apiUrl + '/upload');
      xhr.send(formData);
    },

    /**
     * Handle upload error
     */
    handleUploadError: function(fileIndex, errorMessage) {
      const statusElement = document.getElementById(`support-upload-status-${fileIndex}`);
      const progressElement = document.getElementById(`support-upload-progress-${fileIndex}`);
      const fileItem = document.getElementById(`support-file-item-${fileIndex}`);
      const removeBtn = fileItem.querySelector('.support-widget-file-remove');

      statusElement.textContent = 'Upload failed';
      statusElement.className = 'support-widget-upload-status support-widget-upload-error';
      progressElement.style.display = 'none';
      removeBtn.style.display = 'flex';

      // Remove from arrays
      this.selectedFiles.splice(fileIndex, 1);
      this.uploadedFileUrls.splice(fileIndex, 1);
      this.uploadedFilePaths.splice(fileIndex, 1);
      this.uploadedFileMetadata.splice(fileIndex, 1);

      // Show error message
      this.showError(`Failed to upload file: ${errorMessage}`);

      // Re-render file list
      this.renderFileList();
    },

    /**
     * Remove file from selection and delete from bucket
     */
    removeFile: function(index) {
      if (index >= 0 && index < this.selectedFiles.length) {
        const filePath = this.uploadedFilePaths[index];
        
        // If file was uploaded, delete it from bucket
        if (filePath) {
          this.deleteFileFromBucket(filePath, index);
        } else {
          // If file wasn't uploaded yet, just remove from arrays
          this.selectedFiles.splice(index, 1);
          this.uploadedFileUrls.splice(index, 1);
          this.uploadedFilePaths.splice(index, 1);
          this.renderFileList();
        }
      }
      const fileInput = document.getElementById('support-files');
      fileInput.value = '';
    },

    /**
     * Delete file from bucket
     */
    deleteFileFromBucket: function(filePath, fileIndex) {
      fetch(this.config.apiUrl + '/upload', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ file_path: filePath })
      })
      .then(response => {
        if (!response.ok) {
          return response.json().then(err => {
            throw new Error(err.error?.message || 'Failed to delete file');
          });
        }
        return response.json();
      })
      .then(result => {
        if (result.success) {
          // Remove from arrays
          this.selectedFiles.splice(fileIndex, 1);
          this.uploadedFileUrls.splice(fileIndex, 1);
          this.uploadedFilePaths.splice(fileIndex, 1);
          this.uploadedFileMetadata.splice(fileIndex, 1);
          this.renderFileList();
        } else {
          throw new Error(result.error?.message || 'Failed to delete file');
        }
      })
      .catch(error => {
        console.error('Support Widget Error:', error);
          // Still remove from UI even if deletion fails
        this.selectedFiles.splice(fileIndex, 1);
        this.uploadedFileUrls.splice(fileIndex, 1);
        this.uploadedFilePaths.splice(fileIndex, 1);
        this.uploadedFileMetadata.splice(fileIndex, 1);
        this.renderFileList();
        this.showError(`Failed to delete file: ${error.message || 'Please try again'}`);
      });
    },

    /**
     * Render file list
     */
    renderFileList: function() {
      const fileList = document.getElementById('support-widget-file-list');
      fileList.innerHTML = '';

      if (this.selectedFiles.length === 0) return;

      this.selectedFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.id = `support-file-item-${index}`;
        fileItem.className = 'support-widget-file-item';
        
        const isUploaded = this.uploadedFileUrls[index] !== null && this.uploadedFileUrls[index] !== undefined;
        const statusText = isUploaded ? 'Uploaded ✓' : 'Uploading...';
        const statusClass = isUploaded ? 'support-widget-upload-success' : '';
        
        fileItem.innerHTML = `
          <div class="support-widget-file-info">
            <span class="support-widget-file-name">${file.name}</span>
            <span class="support-widget-file-size">${this.formatFileSize(file.size)}</span>
          </div>
          <div class="support-widget-file-status" style="${isUploaded ? 'display: none;' : ''}">
            <span class="support-widget-upload-status ${statusClass}" id="support-upload-status-${index}">${statusText}</span>
            <div class="support-widget-upload-progress" id="support-upload-progress-${index}">
              <div class="support-widget-progress-bar ${isUploaded ? 'support-widget-progress-complete' : ''}" style="${isUploaded ? 'width: 100%;' : ''}"></div>
            </div>
          </div>
          <button type="button" class="support-widget-file-remove" onclick="SupportWidget.removeFile(${index})" aria-label="Remove file">&times;</button>
        `;
        fileList.appendChild(fileItem);
      });
    },

    /**
     * Format file size
     */
    formatFileSize: function(bytes) {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    },

    /**
     * Toggle modal visibility
     */
    toggleModal: function() {
      this.isOpen = !this.isOpen;
      const modal = document.getElementById('support-widget-modal');
      if (this.isOpen) {
        modal.classList.add('support-widget-open');
        document.body.style.overflow = 'hidden';
        this.showFormView();
      } else {
        this.closeModal();
      }
    },

    /**
     * Close modal
     */
    closeModal: function() {
      this.isOpen = false;
      const modal = document.getElementById('support-widget-modal');
      modal.classList.remove('support-widget-open');
      document.body.style.overflow = '';
      this.selectedFiles = [];
      this.uploadedFileUrls = [];
      this.uploadedFilePaths = [];
      this.uploadedFileMetadata = [];
      this.ticketId = null;
      const form = document.getElementById('support-widget-form');
      form.reset();
      this.clearFieldErrors();
      document.getElementById('support-widget-file-list').innerHTML = '';
      const messageDiv = document.getElementById('support-widget-message');
      messageDiv.innerHTML = '';
      messageDiv.className = 'support-widget-message';
    },

    /**
     * Show form view
     */
    showFormView: function() {
      this.currentView = 'form';
      document.getElementById('support-widget-form-view').style.display = 'block';
      document.getElementById('support-widget-tickets-view').style.display = 'none';
      document.getElementById('support-widget-title').textContent = 'Contact Support';
    },

    /**
     * Show tickets view
     */
    showTicketsView: function() {
      this.currentView = 'tickets';
      document.getElementById('support-widget-form-view').style.display = 'none';
      document.getElementById('support-widget-tickets-view').style.display = 'block';
      document.getElementById('support-widget-title').textContent = 'My Support Tickets';
    },

    /**
     * Load tickets by email
     */
    loadTickets: function() {
      const email = document.getElementById('support-tickets-email').value.trim();
      if (!email || !this.isValidEmail(email)) {
        this.showError('Please enter a valid email address', 'support-widget-tickets-list');
        return;
      }

      const ticketsList = document.getElementById('support-widget-tickets-list');
      ticketsList.innerHTML = '<div class="support-widget-loading">Loading tickets...</div>';

      fetch(`${this.config.apiUrl}/tickets?email=${encodeURIComponent(email)}`)
        .then(response => {
          if (!response.ok) {
            return response.json().then(err => {
              throw new Error(err.error?.message || 'Failed to load tickets');
            });
          }
          return response.json();
        })
        .then(result => {
          if (result.success) {
            this.displayTickets(result.data.tickets || []);
          } else {
            throw new Error(result.error?.message || 'Failed to load tickets');
          }
        })
        .catch(error => {
          console.error('Support Widget Error:', error);
          ticketsList.innerHTML = `<div class="support-widget-error-message">${error.message || 'Failed to load tickets. Please try again.'}</div>`;
        });
    },

    /**
     * Display tickets
     */
    displayTickets: function(tickets) {
      const ticketsList = document.getElementById('support-widget-tickets-list');
      
      if (tickets.length === 0) {
        ticketsList.innerHTML = '<div class="support-widget-empty">No tickets found for this email address.</div>';
        return;
      }

      ticketsList.innerHTML = tickets.map(ticket => `
        <div class="support-widget-ticket-item">
          <div class="support-widget-ticket-header">
            <span class="support-widget-ticket-number">${ticket.ticket_number}</span>
            <span class="support-widget-ticket-status support-widget-status-${ticket.status}">${ticket.status}</span>
          </div>
          <div class="support-widget-ticket-subject">${this.escapeHtml(ticket.subject)}</div>
          <div class="support-widget-ticket-meta">
            <span>${ticket.category}</span>
            <span>${ticket.priority}</span>
            <span>${new Date(ticket.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      `).join('');
    },

    /**
     * Validate email
     */
    isValidEmail: function(email) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },

    /**
     * Validate form fields
     */
    validateForm: function() {
      const form = document.getElementById('support-widget-form');
      const formData = new FormData(form);
      const errors = {};

      // Get field values
      const name = (formData.get('name') || '').trim();
      const email = (formData.get('email') || '').trim();
      const subject = (formData.get('subject') || '').trim();
      const message = (formData.get('message') || '').trim();

      // Clear previous errors
      this.clearFieldErrors();

      // Validate name (required)
      if (!name) {
        errors.name = 'Name is required';
      } else if (name.length < 2) {
        errors.name = 'Name must be at least 2 characters';
      } else if (name.length > 255) {
        errors.name = 'Name must not exceed 255 characters';
      }

      // Validate email (required, format, length)
      if (!email) {
        errors.email = 'Email is required';
      } else if (!this.isValidEmail(email)) {
        errors.email = 'Please enter a valid email address';
      } else if (email.length > 255) {
        errors.email = 'Email must not exceed 255 characters';
      }

      // Validate subject/title (required, length)
      if (!subject) {
        errors.subject = 'Subject is required';
      } else if (subject.length < 3) {
        errors.subject = 'Subject must be at least 3 characters';
      } else if (subject.length > 255) {
        errors.subject = 'Subject must not exceed 255 characters';
      }

      // Validate message/description (required, length)
      if (!message) {
        errors.message = 'Message is required';
      } else if (message.length < 10) {
        errors.message = 'Message must be at least 10 characters';
      } else if (message.length > 5000) {
        errors.message = 'Message must not exceed 5000 characters';
      }

      // Display errors
      if (Object.keys(errors).length > 0) {
        this.displayFieldErrors(errors);
        return false;
      }

      return true;
    },

    /**
     * Display field errors
     */
    displayFieldErrors: function(errors) {
      Object.keys(errors).forEach(fieldName => {
        const field = document.getElementById(`support-${fieldName}`);
        if (field) {
          field.classList.add('support-widget-field-error');
          
          // Create or update error message
          let errorDiv = field.parentElement.querySelector('.support-widget-field-error-message');
          if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'support-widget-field-error-message';
            field.parentElement.appendChild(errorDiv);
          }
          errorDiv.textContent = errors[fieldName];
        }
      });
    },

    /**
     * Clear all field errors
     */
    clearFieldErrors: function() {
      const fields = document.querySelectorAll('#support-widget-form input, #support-widget-form textarea');
      fields.forEach(field => {
        field.classList.remove('support-widget-field-error');
        const errorDiv = field.parentElement.querySelector('.support-widget-field-error-message');
        if (errorDiv) {
          errorDiv.remove();
        }
      });
    },

    /**
     * Validate individual field
     */
    validateField: function(fieldName) {
      const form = document.getElementById('support-widget-form');
      const formData = new FormData(form);
      const field = document.getElementById(`support-${fieldName}`);
      
      if (!field) return true;

      let value = (formData.get(fieldName) || '').trim();
      let error = null;

      switch(fieldName) {
        case 'name':
          if (!value) {
            error = 'Name is required';
          } else if (value.length < 2) {
            error = 'Name must be at least 2 characters';
          } else if (value.length > 255) {
            error = 'Name must not exceed 255 characters';
          }
          break;
        case 'email':
          if (!value) {
            error = 'Email is required';
          } else if (!this.isValidEmail(value)) {
            error = 'Please enter a valid email address';
          } else if (value.length > 255) {
            error = 'Email must not exceed 255 characters';
          }
          break;
        case 'subject':
          if (!value) {
            error = 'Subject is required';
          } else if (value.length < 3) {
            error = 'Subject must be at least 3 characters';
          } else if (value.length > 255) {
            error = 'Subject must not exceed 255 characters';
          }
          break;
        case 'message':
          if (!value) {
            error = 'Message is required';
          } else if (value.length < 10) {
            error = 'Message must be at least 10 characters';
          } else if (value.length > 5000) {
            error = 'Message must not exceed 5000 characters';
          }
          break;
      }

      // Clear previous error
      field.classList.remove('support-widget-field-error');
      const existingError = field.parentElement.querySelector('.support-widget-field-error-message');
      if (existingError) {
        existingError.remove();
      }

      // Display error if any
      if (error) {
        field.classList.add('support-widget-field-error');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'support-widget-field-error-message';
        errorDiv.textContent = error;
        field.parentElement.appendChild(errorDiv);
        return false;
      }

      return true;
    },

    /**
     * Update character count for field
     */
    updateCharCount: function(fieldName) {
      const field = document.getElementById(`support-${fieldName}`);
      const countElement = document.getElementById(`support-${fieldName}-count`);
      
      if (field && countElement) {
        const length = field.value.length;
        const maxLength = fieldName === 'subject' ? 255 : 5000;
        countElement.textContent = length;
        
        // Change color if approaching limit
        const charCountDiv = countElement.parentElement;
        if (length > maxLength * 0.9) {
          charCountDiv.style.color = '#dc3545';
        } else if (length > maxLength * 0.75) {
          charCountDiv.style.color = '#ffc107';
        } else {
          charCountDiv.style.color = '#6c757d';
        }
      }
    },

    /**
     * Escape HTML
     */
    escapeHtml: function(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },

    /**
     * Show error message
     */
    showError: function(message, containerId = 'support-widget-message') {
      const messageDiv = document.getElementById(containerId);
      messageDiv.className = 'support-widget-message support-widget-error';
      messageDiv.innerHTML = `<strong>✗ Error:</strong> ${this.escapeHtml(message)}`;
    },

    /**
     * Submit ticket
     */
    submitTicket: function() {
      // Validate form before submission
      if (!this.validateForm()) {
        const messageDiv = document.getElementById('support-widget-message');
        messageDiv.className = 'support-widget-message support-widget-error';
        messageDiv.innerHTML = '<strong>✗ Please fix the errors above</strong>';
        return;
      }

      const form = document.getElementById('support-widget-form');
      const submitBtn = document.getElementById('support-widget-submit');
      const messageDiv = document.getElementById('support-widget-message');

      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';
      messageDiv.innerHTML = '';
      messageDiv.className = 'support-widget-message';

      const formData = new FormData(form);
      const data = {
        name: formData.get('name'),
        email: formData.get('email'),
        subject: formData.get('subject'),
        message: formData.get('message'),
        category: formData.get('category') || 'general',
        priority: formData.get('priority') || 'medium',
        api_key: this.config.apiKey,
        source_url: window.location.href,
        user_agent: navigator.userAgent,
        metadata: {
          referrer: document.referrer,
          timestamp: new Date().toISOString()
        }
      };

      // Check if all files are uploaded
      const pendingUploads = this.uploadedFileUrls.filter((url, index) => 
        this.selectedFiles[index] && url === null
      ).length;

      if (pendingUploads > 0) {
        messageDiv.className = 'support-widget-message support-widget-error';
        messageDiv.innerHTML = '<strong>✗ Please wait for all files to finish uploading</strong>';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Ticket';
        return;
      }

      // Prepare data with file information (URLs, paths, and metadata)
      const fileInfos = [];
      this.uploadedFileUrls.forEach((url, index) => {
        if (url !== null && this.uploadedFileMetadata[index]) {
          fileInfos.push({
            file_url: url,
            file_path: this.uploadedFilePaths[index],
            file_name: this.uploadedFileMetadata[index].name,
            file_size: this.uploadedFileMetadata[index].size,
            file_type: this.uploadedFileMetadata[index].type
          });
        }
      });
      
      if (fileInfos.length > 0) {
        data.file_attachments = fileInfos; // Send complete file information
      }
      
      // Include ticket_id if available (from file uploads)
      // This ensures the ticket uses the same UUID as the files
      if (this.ticketId) {
        data.ticket_id = this.ticketId;
      }

      // Send as JSON instead of FormData since files are already uploaded
      fetch(this.config.apiUrl + '/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })
      .then(response => {
        if (!response.ok) {
          return response.json().then(err => {
            throw new Error(err.error?.message || 'Failed to submit ticket');
          });
        }
        return response.json();
      })
      .then(result => {
        if (result.success) {
          messageDiv.className = 'support-widget-message support-widget-success';
          messageDiv.innerHTML = `
            <strong>✓ Success!</strong><br>
            ${result.data.message}<br>
            <small>Ticket #: ${result.data.ticket.ticket_number}</small>
            ${result.data.attachments_uploaded > 0 ? `<br><small>${result.data.attachments_uploaded} file(s) uploaded</small>` : ''}
          `;
          form.reset();
          this.selectedFiles = [];
          this.uploadedFileUrls = [];
          this.uploadedFilePaths = [];
          this.uploadedFileMetadata = [];
          this.ticketId = null;
          document.getElementById('support-widget-file-list').innerHTML = '';
          this.clearFieldErrors();
          this.updateCharCount('subject');
          this.updateCharCount('message');
          
          setTimeout(() => {
            this.closeModal();
            messageDiv.innerHTML = '';
          }, 4000);
        } else {
          throw new Error(result.error?.message || 'Failed to submit ticket');
        }
      })
      .catch(error => {
        console.error('Support Widget Error:', error);
        messageDiv.className = 'support-widget-message support-widget-error';
        messageDiv.innerHTML = `<strong>✗ Error:</strong> ${this.escapeHtml(error.message || 'Failed to submit ticket. Please try again.')}`;
      })
      .finally(() => {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Ticket';
      });
    },

    /**
     * Inject CSS styles with production-quality fonts
     */
    injectStyles: function() {
      const style = document.createElement('style');
      style.textContent = `
        /* System Font Stack - Production Quality */
        * {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        /* Widget Button */
        .support-widget-btn {
          position: fixed;
          z-index: ${this.config.zIndex};
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 22px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 50px;
          cursor: pointer;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
          font-size: 15px;
          font-weight: 600;
          letter-spacing: 0.3px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          font-family: inherit;
        }
        .support-widget-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
        }
        .support-widget-btn:active {
          transform: translateY(0);
        }
        .support-widget-btn svg {
          width: 20px;
          height: 20px;
          flex-shrink: 0;
        }
        .support-widget-btn-bottom-right { bottom: 24px; right: 24px; }
        .support-widget-btn-bottom-left { bottom: 24px; left: 24px; }
        .support-widget-btn-top-right { top: 24px; right: 24px; }
        .support-widget-btn-top-left { top: 24px; left: 24px; }

        /* Modal */
        .support-widget-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: ${this.config.zIndex + 1};
          display: none;
          align-items: center;
          justify-content: center;
          padding: 20px;
          box-sizing: border-box;
        }
        .support-widget-modal.support-widget-open {
          display: flex;
        }
        .support-widget-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
        }
        .support-widget-content {
          position: relative;
          background: white;
          border-radius: 20px;
          width: 100%;
          max-width: 600px;
          max-height: 90vh;
          overflow: hidden;
          box-shadow: 0 25px 70px rgba(0, 0, 0, 0.4);
          z-index: 1;
          display: flex;
          flex-direction: column;
        }
        .support-widget-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px 28px;
          border-bottom: 1px solid #e9ecef;
          flex-shrink: 0;
        }
        .support-widget-header h2 {
          margin: 0;
          font-size: 26px;
          font-weight: 700;
          color: #1a1a1a;
          letter-spacing: -0.5px;
          font-family: inherit;
        }
        .support-widget-close {
          background: none;
          border: none;
          font-size: 32px;
          color: #6c757d;
          cursor: pointer;
          padding: 0;
          width: 36px;
          height: 36px;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          transition: all 0.2s;
          font-family: inherit;
        }
        .support-widget-close:hover {
          color: #1a1a1a;
          background: #f8f9fa;
        }
        .support-widget-body {
          overflow-y: auto;
          flex: 1;
        }
        .support-widget-view {
          padding: 28px;
        }
        .support-widget-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .support-widget-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .support-widget-field label {
          font-weight: 600;
          color: #495057;
          font-size: 14px;
          letter-spacing: 0.2px;
          font-family: inherit;
        }
        .support-widget-field input,
        .support-widget-field select,
        .support-widget-field textarea {
          width: 100%;
          padding: 14px 16px;
          border: 2px solid #e9ecef;
          border-radius: 10px;
          font-size: 15px;
          font-family: inherit;
          transition: all 0.2s;
          box-sizing: border-box;
          background: white;
          color: #1a1a1a;
        }
        .support-widget-field input:focus,
        .support-widget-field select:focus,
        .support-widget-field textarea:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        .support-widget-field input.support-widget-field-error,
        .support-widget-field textarea.support-widget-field-error {
          border-color: #dc3545;
          box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.1);
        }
        .support-widget-field-error-message {
          color: #dc3545;
          font-size: 13px;
          margin-top: 4px;
          font-weight: 500;
          font-family: inherit;
        }
        .support-widget-char-count {
          font-size: 12px;
          color: #6c757d;
          margin-top: 4px;
          text-align: right;
          font-family: inherit;
        }
        .support-widget-field textarea {
          resize: vertical;
          min-height: 120px;
          font-family: inherit;
        }
        .support-widget-file-upload {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .support-widget-file-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          background: #f8f9fa;
          border: 2px dashed #dee2e6;
          border-radius: 10px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          color: #495057;
          transition: all 0.2s;
          font-family: inherit;
        }
        .support-widget-file-btn:hover {
          background: #e9ecef;
          border-color: #667eea;
          color: #667eea;
        }
        .support-widget-file-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .support-widget-file-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          background: #f8f9fa;
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
          position: relative;
        }
        .support-widget-file-info {
          display: flex;
          flex-direction: column;
          flex: 1;
          gap: 4px;
        }
        .support-widget-file-name {
          color: #495057;
          font-weight: 500;
        }
        .support-widget-file-size {
          color: #6c757d;
          font-size: 13px;
        }
        .support-widget-file-status {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 120px;
        }
        .support-widget-upload-status {
          font-size: 12px;
          color: #6c757d;
          font-weight: 500;
        }
        .support-widget-upload-success {
          color: #28a745;
        }
        .support-widget-upload-error {
          color: #dc3545;
        }
        .support-widget-upload-progress {
          width: 100%;
          height: 4px;
          background: #e9ecef;
          border-radius: 2px;
          overflow: hidden;
        }
        .support-widget-progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
          width: 0%;
          transition: width 0.3s ease;
        }
        .support-widget-progress-complete {
          background: #28a745;
        }
        .support-widget-file-remove {
          background: none;
          border: none;
          color: #dc3545;
          cursor: pointer;
          font-size: 20px;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: all 0.2s;
        }
        .support-widget-file-remove:hover {
          background: #fee;
        }
        .support-widget-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 8px;
          flex-wrap: wrap;
        }
        .support-widget-actions button {
          padding: 14px 28px;
          border: none;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
          letter-spacing: 0.2px;
        }
        .support-widget-actions button[type="button"] {
          background: #f8f9fa;
          color: #495057;
        }
        .support-widget-actions button[type="button"]:hover {
          background: #e9ecef;
        }
        .support-widget-actions button[type="submit"] {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .support-widget-actions button[type="submit"]:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }
        .support-widget-actions button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .support-widget-message {
          padding: 14px 18px;
          border-radius: 10px;
          font-size: 14px;
          line-height: 1.6;
          font-family: inherit;
        }
        .support-widget-success {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }
        .support-widget-error {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }
        .support-widget-tickets-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .support-widget-tickets-header h3 {
          margin: 0;
          font-size: 22px;
          font-weight: 700;
          color: #1a1a1a;
          font-family: inherit;
        }
        .support-widget-back-btn {
          padding: 10px 18px;
          background: #f8f9fa;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          color: #495057;
          font-family: inherit;
        }
        .support-widget-back-btn:hover {
          background: #e9ecef;
        }
        .support-widget-tickets-search {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
        }
        .support-widget-tickets-search input {
          flex: 1;
          padding: 14px 16px;
          border: 2px solid #e9ecef;
          border-radius: 10px;
          font-size: 15px;
          font-family: inherit;
        }
        .support-widget-tickets-search button {
          padding: 14px 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          font-size: 15px;
          font-weight: 600;
          font-family: inherit;
        }
        .support-widget-tickets-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .support-widget-ticket-item {
          padding: 18px;
          background: #f8f9fa;
          border-radius: 12px;
          border: 1px solid #e9ecef;
          transition: all 0.2s;
        }
        .support-widget-ticket-item:hover {
          background: #e9ecef;
        }
        .support-widget-ticket-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        .support-widget-ticket-number {
          font-weight: 700;
          color: #1a1a1a;
          font-size: 15px;
          font-family: inherit;
        }
        .support-widget-ticket-status {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          font-family: inherit;
        }
        .support-widget-status-open { background: #d4edda; color: #155724; }
        .support-widget-status-in_progress { background: #fff3cd; color: #856404; }
        .support-widget-status-resolved { background: #d1ecf1; color: #0c5460; }
        .support-widget-status-closed { background: #d6d8db; color: #383d41; }
        .support-widget-ticket-subject {
          font-weight: 600;
          color: #495057;
          margin-bottom: 8px;
          font-size: 15px;
          font-family: inherit;
        }
        .support-widget-ticket-meta {
          display: flex;
          gap: 16px;
          font-size: 13px;
          color: #6c757d;
          font-family: inherit;
        }
        .support-widget-loading,
        .support-widget-empty,
        .support-widget-error-message {
          padding: 40px;
          text-align: center;
          color: #6c757d;
          font-size: 15px;
          font-family: inherit;
        }
        .support-widget-error-message {
          color: #721c24;
          background: #f8d7da;
          border-radius: 10px;
        }

        /* Responsive */
        @media (max-width: 640px) {
          .support-widget-content {
            max-width: 100%;
            border-radius: 0;
            max-height: 100vh;
          }
          .support-widget-header {
            padding: 20px;
          }
          .support-widget-view {
            padding: 20px;
          }
          .support-widget-actions {
            flex-direction: column;
          }
          .support-widget-actions button {
            width: 100%;
          }
        }
      `;
      document.head.appendChild(style);
    }
  };

  window.SupportWidget = SupportWidget;

})(window, document);
