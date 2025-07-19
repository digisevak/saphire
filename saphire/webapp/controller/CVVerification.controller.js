sap.ui.define([
    "saphire/controller/BaseController",
    "sap/ui/core/Fragment",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/routing/History"
], function (BaseController, Fragment, MessageToast, MessageBox, JSONModel, History) {
    "use strict";

    /**
     * @namespace saphire.controller
     */
    return BaseController.extend("saphire.controller.CVVerification", {

        onInit: function () {
            // Initialize local model for view state
            var oViewModel = new JSONModel({
                busy: false,
                fileUploaded: false,
                fileName: "",
                fileSize: "",
                uploadProgress: 0,
                consentGiven: false,
                candidateId: "Candidate0420",
                company: "VCG Digital",
                notifications: [],
                showNotifications: false,
                JobPostings: [
                    {
                        title: "Senior Software Developer",
                        description: "Full-stack development position",
                        location: "Remote/Hybrid"
                    },
                    {
                        title: "UI/UX Designer",
                        description: "Creative design role",
                        location: "New York, NY"
                    },
                    {
                        title: "Project Manager",
                        description: "Technical project management",
                        location: "San Francisco, CA"
                    }
                ]
            });
            this.setModel(oViewModel, "viewModel");

            // Setup drag and drop functionality
            this._setupDragAndDrop();

            // Setup file upload events
            this._setupFileUploader();
        },

        _setupDragAndDrop: function () {
            var oUploadArea = this.byId("uploadArea");
            
            if (!oUploadArea) {
                return;
            }

            // Wait for DOM to be ready
            oUploadArea.addEventDelegate({
                onAfterRendering: function () {
                    setTimeout(function () {
                        var oAreaDomRef = oUploadArea.getDomRef();
                        if (oAreaDomRef) {
                            this._addDragAndDropListeners(oAreaDomRef);
                        }
                    }.bind(this), 100);
                }.bind(this)
            });
        },

        _addDragAndDropListeners: function (oDomRef) {
            var that = this;

            // Prevent default drag behaviors
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function (eventName) {
                oDomRef.addEventListener(eventName, function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                }, false);
            });

            // Highlight drop area on drag enter/over
            ['dragenter', 'dragover'].forEach(function (eventName) {
                oDomRef.addEventListener(eventName, function () {
                    oDomRef.classList.add('dragover');
                }, false);
            });

            // Remove highlight on drag leave
            oDomRef.addEventListener('dragleave', function () {
                oDomRef.classList.remove('dragover');
            }, false);

            // Handle dropped files
            oDomRef.addEventListener('drop', function (e) {
                oDomRef.classList.remove('dragover');
                var files = e.dataTransfer.files;
                if (files.length > 0) {
                    that._handleFile(files[0]);
                }
            }, false);

            // Handle click to browse - removed from here since we have a separate button
        },

        _setupFileUploader: function () {
            var oFileUploader = this.byId("fileUploader");
            
            // Set up additional parameters for upload
            oFileUploader.addHeaderParameter(new sap.ui.unified.FileUploaderParameter({
                name: "X-CSRF-Token",
                value: "Fetch"
            }));

            // Make sure the FileUploader is properly initialized
            var that = this;
            oFileUploader.addEventDelegate({
                onAfterRendering: function () {
                    // Ensure the file uploader is ready
                    setTimeout(function () {
                        that._fileUploaderReady = true;
                    }, 100);
                }
            });
        },

        _triggerFileSelection: function () {
            var oFileUploader = this.byId("fileUploader");
            
            if (!oFileUploader) {
                MessageToast.show("File uploader not available");
                return;
            }

            try {
                var oDomRef = oFileUploader.getDomRef();
                if (oDomRef) {
                    var oInput = oDomRef.querySelector('input[type="file"]');
                    if (oInput) {
                        oInput.click();
                        return;
                    }
                }

                if (oFileUploader.oFileUpload) {
                    oFileUploader.oFileUpload.click();
                    return;
                }

                this._useNativeFileInput();
                
            } catch (e) {
                console.error("Error triggering file selection:", e);
                // Fallback to native file input
                this._useNativeFileInput();
            }
        },

        _useNativeFileInput: function () {
            var oNativeInput = document.getElementById('nativeFileInput');
            if (oNativeInput) {
                oNativeInput.click();
            } else {
                this._createTempFileInput();
            }
        },

        _createTempFileInput: function () {
            var that = this;
            var oTempInput = document.createElement('input');
            oTempInput.type = 'file';
            oTempInput.accept = '.pdf,.doc,.docx,.txt';
            oTempInput.style.display = 'none';
            
            oTempInput.addEventListener('change', function (e) {
                if (e.target.files && e.target.files.length > 0) {
                    that._handleFile(e.target.files[0]);
                }
                // Remove the temporary input
                document.body.removeChild(oTempInput);
            });
            
            document.body.appendChild(oTempInput);
            oTempInput.click();
        },

        onHtmlFileInputRendered: function () {
            var that = this;
            var oNativeInput = document.getElementById('nativeFileInput');
            
            if (oNativeInput) {
                oNativeInput.addEventListener('change', function (e) {
                    if (e.target.files && e.target.files.length > 0) {
                        that._handleFile(e.target.files[0]);
                    }
                    // Reset the input value so the same file can be selected again
                    e.target.value = '';
                });
            }
        },

        onFileChange: function (oEvent) {
            let aFiles = oEvent.getParameter("files");
            let oFileUploader = oEvent.getSource();
            
            if (aFiles && aFiles.length > 0) {
                const oFile = aFiles[0]; 
                this._processUploadedFile(oFile, oFileUploader);
            }
        },

        _processUploadedFile: function (oFile, oFileUploader) {
            // Validate file first
            if (!this._validateFile(oFile)) {
                if (oFileUploader) {
                    oFileUploader.clear();
                }
                return;
            }

            // Show upload progress
            var oViewModel = this.getModel("viewModel");
            oViewModel.setProperty("/uploadProgress", 0);
            this.byId("uploadProgress").setVisible(true);

            const oReader = new FileReader();
            
            // Show progress during file reading
            oReader.onprogress = function (e) {
                if (e.lengthComputable) {
                    var percentLoaded = Math.round((e.loaded / e.total) * 100);
                    oViewModel.setProperty("/uploadProgress", percentLoaded);
                }
            }.bind(this);

            oReader.onload = function (e) {
                const sDataUrl = `data:${oFile.type};base64,${e.target.result.split(",")[1]}`;
                
                const oFileDetails = {
                    name: oFile.name,
                    size: oFile.size,
                    type: oFile.type,
                    content: sDataUrl,
                    uploadedAt: new Date().toISOString()
                };

                // Update model with file information
                oViewModel.setProperty("/fileName", oFile.name);
                oViewModel.setProperty("/fileSize", this._formatFileSize(oFile.size));
                oViewModel.setProperty("/fileUploaded", true);
                oViewModel.setProperty("/fileDetails", oFileDetails);
                oViewModel.setProperty("/uploadProgress", 100);

                this._updateUploadUI(true);

                this._showNotification("File uploaded successfully: " + oFile.name, "Success");

                this._updateSubmitButtonState();

                if (oFileUploader) {
                    oFileUploader.clear();
                }

                setTimeout(function () {
                    this.byId("uploadProgress").setVisible(false);
                }.bind(this), 1000);

            }.bind(this);

            oReader.onerror = function () {
                this._showNotification("Error reading file. Please try again.", "Error");
                this.byId("uploadProgress").setVisible(false);
            }.bind(this);
            
            oReader.readAsDataURL(oFile);
        },

        _handleFile: function (oFile) {
            this._processUploadedFile(oFile, null);
        },

        _validateFile: function (oFile) {
            var aAllowedTypes = [
                "application/pdf", 
                "application/msword", 
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "text/plain" 
            ];
            var iMaxSize = 10 * 1024 * 1024; // 10MB for documents

            // Check file type
            if (aAllowedTypes.indexOf(oFile.type) === -1) {
                this._showNotification("Invalid file type. Please upload PDF, DOC, DOCX, or TXT files only.", "Error");
                return false;
            }

            if (oFile.size > iMaxSize) {
                this._showNotification("File size exceeds 10MB limit. Please choose a smaller file.", "Error");
                return false;
            }

            return true;
        },

        _formatFileSize: function (iBytes) {
            if (iBytes === 0) return "0 Bytes";
            var k = 1024;
            var aSizes = ["Bytes", "KB", "MB", "GB"];
            var i = Math.floor(Math.log(iBytes) / Math.log(k));
            return parseFloat((iBytes / Math.pow(k, i)).toFixed(2)) + " " + aSizes[i];
        },

        _updateUploadUI: function (bUploaded) {
            var oViewModel = this.getModel("viewModel");
            
            // Toggle visibility of upload states
            this.byId("uploadIconContainer").setVisible(!bUploaded);
            this.byId("successContainer").setVisible(bUploaded);
            this.byId("removeButton").setVisible(bUploaded);
            this.byId("previewButton").setVisible(bUploaded);

            this.byId("uploadButton").setText(bUploaded ? "Upload Different File" : "Upload Resume");

            if (bUploaded) {
                this.byId("fileNameText").setText("File: " + oViewModel.getProperty("/fileName"));
            }
        },

        onUploadPress: function () {
            var oViewModel = this.getModel("viewModel");

            // Always trigger file selection regardless of current state
            this._triggerFileSelection();
        },

        onTypeMismatch: function (oEvent) {
            this._showNotification("Invalid file type. Please upload PDF, DOC, DOCX, or TXT files only.", "Error");
        },

        onFileSizeExceed: function (oEvent) {
            this._showNotification("File size exceeds 10MB limit. Please choose a smaller file.", "Error");
        },

        onRemoveFile: function () {
            var that = this;
            
            MessageBox.confirm("Are you sure you want to remove the uploaded file?", {
                actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                emphasizedAction: MessageBox.Action.YES,
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.YES) {
                        that._resetUploadState();
                    }
                }
            });
        },

        _resetUploadState: function () {
            var oViewModel = this.getModel("viewModel");
            var oFileUploader = this.byId("fileUploader");
            
            // Reset model
            oViewModel.setProperty("/fileUploaded", false);
            oViewModel.setProperty("/fileName", "");
            oViewModel.setProperty("/fileSize", "");
            oViewModel.setProperty("/uploadProgress", 0);
            oViewModel.setProperty("/fileDetails", null);
            
            // Reset UI
            this._updateUploadUI(false);
            
            // Clear file uploader
            if (oFileUploader) {
                oFileUploader.clear();
            }
            
            // Hide progress indicator
            this.byId("uploadProgress").setVisible(false);
            
            // Update submit button state
            this._updateSubmitButtonState();
            
            MessageToast.show("File removed successfully");
        },

        onPreviewFile: function () {
            var oViewModel = this.getModel("viewModel");
            var oFileDetails = oViewModel.getProperty("/fileDetails");
            
            if (oFileDetails && oFileDetails.content) {
                // Create a blob URL for preview
                var byteCharacters = atob(oFileDetails.content.split(',')[1]);
                var byteNumbers = new Array(byteCharacters.length);
                for (var i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                var byteArray = new Uint8Array(byteNumbers);
                var blob = new Blob([byteArray], { type: oFileDetails.type });
                var url = URL.createObjectURL(blob);
                
                // Open in new window
                window.open(url, '_blank');
                
                // Clean up the URL after a delay
                setTimeout(function() {
                    URL.revokeObjectURL(url);
                }, 1000);
            } else {
                MessageToast.show("No file available for preview");
            }
        },

        onConsentChange: function (oEvent) {
            var bSelected = oEvent.getParameter("selected");
            this.getModel("viewModel").setProperty("/consentGiven", bSelected);
            this._updateSubmitButtonState();
        },

        _updateSubmitButtonState: function () {
            var oViewModel = this.getModel("viewModel");
            var bFileUploaded = oViewModel.getProperty("/fileUploaded");
            var bConsentGiven = oViewModel.getProperty("/consentGiven");
            
            this.byId("submitButton").setEnabled(bFileUploaded && bConsentGiven);
        },

        onSubmitApplication: function () {
            var that = this;
            var oViewModel = this.getModel("viewModel");
            
            MessageBox.confirm("Are you ready to submit your application?", {
                actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                emphasizedAction: MessageBox.Action.YES,
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.YES) {
                        that._submitApplication();
                    }
                }
            });
        },

        _submitApplication: function () {
            var oViewModel = this.getModel("viewModel");
            var oFileDetails = oViewModel.getProperty("/fileDetails");
            var sCandidateId = oViewModel.getProperty("/candidateId");
            
            oViewModel.setProperty("/busy", true);
            
            // Prepare data for CAP backend
            var oPayload = {
                candidateId: sCandidateId,
                fileName: oFileDetails.name,
                fileType: oFileDetails.type,
                fileSize: oFileDetails.size,
                fileContent: oFileDetails.content,
                uploadedAt: oFileDetails.uploadedAt,
                consentGiven: oViewModel.getProperty("/consentGiven"),
                documentType: this._determineDocumentType(oFileDetails.name)
            };
        
            // Make AJAX call to CAP service
            $.ajax({
                url: "/api/candidates/upload-document", 
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify(oPayload),
                timeout: 120000, 
                success: function (oData) {
                    oViewModel.setProperty("/busy", false);
                    
                    if (oData.success && oData.parsedData) {
                        this._storeCVDataInLocalModel(oData);
                        
                        MessageBox.success("CV processed successfully! Document ID: " + (oData.documentId || "N/A"), {
                            actions: [MessageBox.Action.OK],
                            emphasizedAction: MessageBox.Action.OK,
                            onClose: function () {
                              
                                this.getRouter().navTo("candidateInformation", {
                                    candidateId: sCandidateId
                                });
                            }.bind(this)
                        });
                    } else {
                        MessageBox.error("CV processing completed but no parsed data received.");
                    }
                }.bind(this),
                error: function (jqXHR, textStatus, errorThrown) {
                    oViewModel.setProperty("/busy", false);
                    
                    var sErrorMessage = "CV processing failed. Please try again.";
                    if (jqXHR.responseJSON && jqXHR.responseJSON.error) {
                        sErrorMessage = jqXHR.responseJSON.error.message || sErrorMessage;
                        
                        // Show specific error details if available
                        if (jqXHR.responseJSON.error.details) {
                            sErrorMessage += "\n\nDetails: " + jqXHR.responseJSON.error.details;
                        }
                    } else if (textStatus === "timeout") {
                        sErrorMessage = "CV processing timeout. Please try with a smaller file or check your connection.";
                    }
                    
                    MessageBox.error(sErrorMessage);
                }.bind(this)
            });
        },
        
        _storeCVDataInLocalModel: function(oResponse) {
            try {
                // Get the local model
                var oLocalModel = this.getOwnerComponent().getModel("localModel");
                
                var oCVInformation = {
                    candidateId: oResponse.parsedData?.personalInfo?.candidateId || this.getModel("viewModel").getProperty("/candidateId"),
                    documentId: oResponse.documentId,
                    processingTime: oResponse.metrics?.processingTime,
                    
                    // Header Information
                    header: {
                        fullName: this._getFullName(oResponse.parsedData?.personalInfo),
                        currentRole: this._getCurrentRole(oResponse.parsedData?.experience),
                        location: oResponse.parsedData?.personalInfo?.location || "",
                        profileImage: null,
                        completenessScore: oResponse.metrics?.completenessScore || 0,
                        confidence: oResponse.metrics?.validation?.isValid ? "High" : "Medium"
                    },
                    
                    // Personal Information
                    personalInfo: {
                        firstName: oResponse.parsedData?.personalInfo?.firstName || "",
                        lastName: oResponse.parsedData?.personalInfo?.lastName || "",
                        email: oResponse.parsedData?.personalInfo?.email || "",
                        phone: oResponse.parsedData?.personalInfo?.phone || "",
                        location: oResponse.parsedData?.personalInfo?.location || "",
                        summary: oResponse.parsedData?.personalInfo?.summary || "",
                        linkedIn: oResponse.parsedData?.personalInfo?.linkedIn || "",
                        portfolio: oResponse.parsedData?.personalInfo?.portfolio || "",
                        github: oResponse.parsedData?.personalInfo?.github || ""
                    },
                    
                    // Work Experience
                    experience: this._formatExperience(oResponse.parsedData?.experience || []),
                    
                    // Education
                    education: this._formatEducation(oResponse.parsedData?.education || []),
                    
                    // Skills categorized
                    skills: this._formatSkills(oResponse.parsedData?.skills || {}),
                    
                    // Projects
                    projects: this._formatProjects(oResponse.parsedData?.projects || []),
                    
                    // Certifications
                    certifications: this._formatCertifications(oResponse.parsedData?.certifications || []),
                    
                    // Languages
                    languages: this._formatLanguages(oResponse.parsedData?.languages || []),
                    
                    // Enhancement data
                    enhancement: oResponse.parsedData?.enhancement || {},
                    
                    // Processing metrics
                    metrics: {
                        completenessScore: oResponse.metrics?.completenessScore || 0,
                        validation: oResponse.metrics?.validation || {},
                        textLength: oResponse.metrics?.textLength || 0,
                        processingTime: oResponse.metrics?.processingTime
                    },
                    
                    // Raw data for reference
                    rawParsedData: oResponse.parsedData
                };
                
                oLocalModel.setProperty("/cvInformation", oCVInformation);
                
                console.log("CV information stored in local model:", oCVInformation);
                
            } catch (error) {
                console.error("Error storing CV data in local model:", error);
            }
        },
        
        // Helper methods for formatting data
        _getFullName: function(personalInfo) {
            if (!personalInfo) return "Unknown Candidate";
            return (personalInfo.firstName + " " + personalInfo.lastName).trim() || "Unknown Candidate";
        },
        
        _getCurrentRole: function(experience) {
            if (!experience || !Array.isArray(experience) || experience.length === 0) {
                return "Job Seeker";
            }
            
            // Find current role or most recent role
            var currentRole = experience.find(exp => exp.current) || experience[0];
            return currentRole.title || "Professional";
        },
        
        _formatExperience: function(experience) {
            if (!Array.isArray(experience)) return [];
            
            return experience.map(function(exp, index) {
                return {
                    id: "exp_" + index,
                    title: exp.title || "",
                    company: exp.company || "",
                    location: exp.location || "",
                    startDate: exp.startDate || "",
                    endDate: exp.endDate || "",
                    current: exp.current || false,
                    duration: this._calculateDuration(exp.startDate, exp.endDate, exp.current),
                    description: exp.description || "",
                    achievements: Array.isArray(exp.achievements) ? exp.achievements : [],
                    technologies: Array.isArray(exp.technologies) ? exp.technologies : [],
                    displayText: (exp.title || "") + " at " + (exp.company || "")
                };
            }.bind(this));
        },
        
        _formatEducation: function(education) {
            if (!Array.isArray(education)) return [];
            
            return education.map(function(edu, index) {
                return {
                    id: "edu_" + index,
                    degree: edu.degree || "",
                    major: edu.major || "",
                    institution: edu.institution || "",
                    startDate: edu.startDate || "",
                    endDate: edu.endDate || "",
                    gpa: edu.gpa || "",
                    achievements: Array.isArray(edu.achievements) ? edu.achievements : [],
                    coursework: edu.coursework || "",
                    displayText: (edu.degree || "") + " in " + (edu.major || "") + " from " + (edu.institution || "")
                };
            });
        },
        
        _formatSkills: function(skills) {
            return {
                technical: this._formatSkillArray(skills.technical || []),
                programming: this._formatSkillArray(skills.programming || []),
                frameworks: this._formatSkillArray(skills.frameworks || []),
                tools: this._formatSkillArray(skills.tools || []),
                languages: this._formatSkillArray(skills.languages || []),
                soft: this._formatSkillArray(skills.soft || [])
            };
        },
        
        _formatSkillArray: function(skillArray) {
            if (!Array.isArray(skillArray)) return [];
            
            return skillArray.map(function(skill, index) {
                if (typeof skill === 'string') {
                    return {
                        id: "skill_" + index,
                        name: skill,
                        level: 5, 
                        experience: 0
                    };
                } else {
                    return {
                        id: "skill_" + index,
                        name: skill.name || skill,
                        level: skill.level || 5,
                        experience: skill.experience || 0
                    };
                }
            });
        },
        
        _formatProjects: function(projects) {
            if (!Array.isArray(projects)) return [];
            
            return projects.map(function(project, index) {
                return {
                    id: "proj_" + index,
                    name: project.name || "",
                    description: project.description || "",
                    technologies: Array.isArray(project.technologies) ? project.technologies : [],
                    startDate: project.startDate || "",
                    endDate: project.endDate || "",
                    url: project.url || "",
                    role: project.role || "",
                    status: project.endDate ? "Completed" : "Ongoing"
                };
            });
        },
        
        _formatCertifications: function(certifications) {
            if (!Array.isArray(certifications)) return [];
            
            return certifications.map(function(cert, index) {
                return {
                    id: "cert_" + index,
                    name: cert.name || "",
                    issuer: cert.issuer || "",
                    date: cert.date || "",
                    expiryDate: cert.expiryDate || "",
                    credentialId: cert.credentialId || "",
                    status: this._getCertificationStatus(cert.expiryDate)
                };
            }.bind(this));
        },
        
        _formatLanguages: function(languages) {
            if (!Array.isArray(languages)) return [];
            
            return languages.map(function(lang, index) {
                return {
                    id: "lang_" + index,
                    language: lang.language || "",
                    proficiency: lang.proficiency || "",
                    level: this._getProficiencyLevel(lang.proficiency)
                };
            });
        },
        
        _calculateDuration: function(startDate, endDate, isCurrent) {
            if (!startDate) return "";
            
            var start = new Date(startDate);
            var end = isCurrent ? new Date() : (endDate ? new Date(endDate) : new Date());
            
            var months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
            
            if (months < 12) {
                return months + " month" + (months !== 1 ? "s" : "");
            } else {
                var years = Math.floor(months / 12);
                var remainingMonths = months % 12;
                var result = years + " year" + (years !== 1 ? "s" : "");
                if (remainingMonths > 0) {
                    result += " " + remainingMonths + " month" + (remainingMonths !== 1 ? "s" : "");
                }
                return result;
            }
        },
        
        _getCertificationStatus: function(expiryDate) {
            if (!expiryDate) return "Valid";
            
            var expiry = new Date(expiryDate);
            var now = new Date();
            
            if (expiry < now) return "Expired";
            
            var monthsUntilExpiry = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);
            if (monthsUntilExpiry < 3) return "Expiring Soon";
            
            return "Valid";
        },
        
        _getProficiencyLevel: function(proficiency) {
            var proficiencyMap = {
                "native": 5,
                "fluent": 4,
                "advanced": 4,
                "intermediate": 3,
                "basic": 2,
                "beginner": 1
            };
            
            return proficiencyMap[proficiency?.toLowerCase()] || 3;
        },

        _determineDocumentType: function (sFileName) {
            var sLowerName = sFileName.toLowerCase();
            if (sLowerName.includes('cv') || sLowerName.includes('resume')) {
                return 'CV';
            } else if (sLowerName.includes('cover') || sLowerName.includes('letter')) {
                return 'COVER_LETTER';
            }
            return 'DOCUMENT';
        },

        onSaveDraft: function () {
            var oViewModel = this.getModel("viewModel");
            
            if (!oViewModel.getProperty("/fileUploaded")) {
                MessageToast.show("Please upload a resume first");
                return;
            }
            
            // Save draft logic
            MessageToast.show("Draft saved successfully");
        },

        onCancel: function () {
            var that = this;
            var oViewModel = this.getModel("viewModel");
            
            if (oViewModel.getProperty("/fileUploaded")) {
                MessageBox.confirm("Are you sure you want to cancel? All changes will be lost.", {
                    actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                    emphasizedAction: MessageBox.Action.NO,
                    onClose: function (sAction) {
                        if (sAction === MessageBox.Action.YES) {
                            that.onNavBack();
                        }
                    }
                });
            } else {
                this.onNavBack();
            }
        },

        onNavBack: function () {
            var oHistory = History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();
            
            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                this.getRouter().navTo("home", {}, true);
            }
        },

        onJobPostingPress: function (oEvent) {
            var oBindingContext = oEvent.getSource().getBindingContext("viewModel");
            var oJobPosting = oBindingContext.getObject();
            
            MessageToast.show("Selected: " + oJobPosting.title);
        },

        onMenuPress: function () {
            MessageToast.show("Menu functionality");
        },

        onCloseNotifications: function () {
            this.byId("notificationPanel").setVisible(false);
        },

        _showNotification: function (sMessage, sType) {
            var oMessageStrip = this.byId("messageStrip");
            var oNotificationPanel = this.byId("notificationPanel");
            
            if (oMessageStrip && oNotificationPanel) {
                oMessageStrip.setText(sMessage);
                oMessageStrip.setType(sType);
                oNotificationPanel.setVisible(true);
                
                if (sType === "Success") {
                    setTimeout(function () {
                        oNotificationPanel.setVisible(false);
                    }, 3000);
                }
            } else {
                MessageToast.show(sMessage);
            }
        }
    });
});