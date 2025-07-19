sap.ui.define([
    "saphire/controller/BaseController",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/routing/History",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel"
], function (BaseController, MessageToast, MessageBox, History, Fragment, JSONModel) {
    "use strict";

    return BaseController.extend("saphire.controller.CandidateInformationPage", {

        onInit: function () {
            this.getRouter().getRoute("candidateInformation").attachPatternMatched(this._onObjectMatched, this);
            this._initializeProperties();
        },

        _initializeProperties: function () {
            var oLocalModel = this.getOwnerComponent().getModel("localModel");
            
            // Initialize edit mode and document upload data only if not already set
            if (!oLocalModel.getProperty("/editMode")) {
                oLocalModel.setProperty("/editMode", false);
            }
            if (!oLocalModel.getProperty("/applicationStatus")) {
                oLocalModel.setProperty("/applicationStatus", "Draft");
            }
            if (!oLocalModel.getProperty("/uploadedDocuments")) {
                oLocalModel.setProperty("/uploadedDocuments", {
                    education: [],
                    identity: [],
                    experience: [],
                    other: []
                });
            }
            
            // Initialize application checklist only if not already set
            if (!oLocalModel.getProperty("/applicationChecklist")) {
                oLocalModel.setProperty("/applicationChecklist", [
                    {
                        item: "Personal Information Complete",
                        description: "All required personal details filled",
                        completed: false
                    },
                    {
                        item: "Work Experience Added",
                        description: "At least one work experience entry",
                        completed: false
                    },
                    {
                        item: "Education Information Added",
                        description: "At least one education entry",
                        completed: false
                    },
                    {
                        item: "Skills Information Added",
                        description: "At least 5 skills added",
                        completed: false
                    },
                    {
                        item: "Supporting Documents Uploaded",
                        description: "Identity and education documents uploaded",
                        completed: false
                    },
                    {
                        item: "Profile Review Complete",
                        description: "Profile completeness score above 80%",
                        completed: false
                    }
                ]);
            }
        },

        _onObjectMatched: function (oEvent) {
            var sCandidateId = oEvent.getParameter("arguments").candidateId;
            
            // Get local model
            var oLocalModel = this.getOwnerComponent().getModel("localModel");
            
            // Check if the model exists
            if (!oLocalModel) {
                console.error("Local model not found");
                this._navigateToUpload();
                return;
            }
            
            // Get CV information
            var oCVInformation = oLocalModel.getProperty("/cvInformation");
            
            // Check if CV information exists and belongs to the right candidate
            if (!oCVInformation || !oCVInformation.candidateId || oCVInformation.candidateId !== sCandidateId) {
                console.log("No CV information found for candidate:", sCandidateId);
                this._handleMissingData(sCandidateId);
                return;
            }
            
            console.log("Candidate information loaded successfully for:", sCandidateId);
            console.log("CV Data:", oCVInformation);
            
            // Update application checklist
            this._updateApplicationChecklist();
        },

        _handleMissingData: function (sCandidateId) {
            // Initialize empty data structure to prevent binding errors
            var oLocalModel = this.getOwnerComponent().getModel("localModel");
            
            var oEmptyData = {
                candidateId: sCandidateId,
                header: {
                    fullName: "Loading...",
                    currentRole: "Please wait",
                    location: "",
                    completenessScore: 0
                },
                personalInfo: {
                    firstName: "",
                    lastName: "",
                    email: "",
                    phone: "",
                    location: "",
                    summary: "No CV information available. Please upload a CV first.",
                    linkedIn: "",
                    portfolio: "",
                    github: ""
                },
                experience: [],
                education: [],
                skills: {
                    programming: [],
                    technical: [],
                    frameworks: [],
                    tools: [],
                    soft: []
                },
                projects: [],
                certifications: [],
                languages: [],
                enhancement: {}
            };
            
            oLocalModel.setProperty("/cvInformation", oEmptyData);
            
            // Show message after a short delay to allow view to render
            setTimeout(function() {
                MessageBox.information("No CV information available for this candidate. Please upload a CV first.", {
                    actions: [MessageBox.Action.OK],
                    onClose: function () {
                        this._navigateToUpload();
                    }.bind(this)
                });
            }.bind(this), 500);
        },

        _navigateToUpload: function () {
            this.getRouter().navTo("cvverification");
        },

        // Edit Mode Functions
        onToggleEditMode: function () {
            var oLocalModel = this.getOwnerComponent().getModel("localModel");
            var bEditMode = oLocalModel.getProperty("/editMode");
            
            if (bEditMode) {
                // Save changes
                this._saveChanges();
            } else {
                // Enter edit mode
                oLocalModel.setProperty("/editMode", true);
                MessageToast.show("Edit mode enabled. You can now modify your information.");
            }
        },

        _saveChanges: function () {
            var oLocalModel = this.getOwnerComponent().getModel("localModel");
            
            // Validate required fields
            if (!this._validateRequiredFields()) {
                return;
            }
            
            // Update completeness score
            this._updateCompletenessScore();
            
            // Save to backend (simulate with timeout)
            oLocalModel.setProperty("/busy", true);
            
            setTimeout(function() {
                oLocalModel.setProperty("/editMode", false);
                oLocalModel.setProperty("/busy", false);
                this._updateApplicationChecklist();
                MessageToast.show("Changes saved successfully!");
            }.bind(this), 1000);
        },

        _validateRequiredFields: function () {
            var oLocalModel = this.getOwnerComponent().getModel("localModel");
            var oPersonalInfo = oLocalModel.getProperty("/cvInformation/personalInfo");
            
            var aRequiredFields = [
                { field: "firstName", label: "First Name" },
                { field: "lastName", label: "Last Name" },
                { field: "email", label: "Email" },
                { field: "phone", label: "Phone" },
                { field: "location", label: "Location" }
            ];
            
            var aMissingFields = [];
            
            aRequiredFields.forEach(function(fieldInfo) {
                if (!oPersonalInfo[fieldInfo.field] || oPersonalInfo[fieldInfo.field].trim() === "") {
                    aMissingFields.push(fieldInfo.label);
                }
            });
            
            if (aMissingFields.length > 0) {
                MessageBox.error("Please fill in the following required fields: " + aMissingFields.join(", "));
                return false;
            }
            
            return true;
        },

        _updateCompletenessScore: function () {
            var oLocalModel = this.getOwnerComponent().getModel("localModel");
            var oCVInfo = oLocalModel.getProperty("/cvInformation");
            var oUploadedDocs = oLocalModel.getProperty("/uploadedDocuments");
            
            var iScore = 0;
            var iTotalChecks = 20;
            
            // Personal info completeness (5 points)
            if (oCVInfo.personalInfo.firstName) iScore++;
            if (oCVInfo.personalInfo.lastName) iScore++;
            if (oCVInfo.personalInfo.email) iScore++;
            if (oCVInfo.personalInfo.phone) iScore++;
            if (oCVInfo.personalInfo.location) iScore++;
            
            // Professional summary (2 points)
            if (oCVInfo.enhancement.profileSummary && oCVInfo.enhancement.profileSummary.length > 50) iScore += 2;
            
            // Work experience (4 points)
            if (oCVInfo.experience && oCVInfo.experience.length > 0) iScore += 2;
            if (oCVInfo.experience && oCVInfo.experience.length >= 2) iScore += 2;
            
            // Education (3 points)
            if (oCVInfo.education && oCVInfo.education.length > 0) iScore += 3;
            
            // Skills (3 points)
            var iTotalSkills = this.getTotalSkillsCount(oCVInfo.skills);
            if (iTotalSkills >= 5) iScore += 1;
            if (iTotalSkills >= 10) iScore += 1;
            if (iTotalSkills >= 15) iScore += 1;
            
            // Documents uploaded (3 points)
            if (oUploadedDocs.identity && oUploadedDocs.identity.length > 0) iScore += 1;
            if (oUploadedDocs.education && oUploadedDocs.education.length > 0) iScore += 1;
            if (oUploadedDocs.experience && oUploadedDocs.experience.length > 0) iScore += 1;
            
            var iPercentage = Math.round((iScore / iTotalChecks) * 100);
            oLocalModel.setProperty("/cvInformation/header/completenessScore", iPercentage);
        },

        _updateApplicationChecklist: function () {
            var oLocalModel = this.getOwnerComponent().getModel("localModel");
            var oCVInfo = oLocalModel.getProperty("/cvInformation");
            var oUploadedDocs = oLocalModel.getProperty("/uploadedDocuments");
            var aChecklist = oLocalModel.getProperty("/applicationChecklist");
            
            if (!aChecklist) return;
            
            // Update checklist items
            aChecklist[0].completed = this._isPersonalInfoComplete(oCVInfo.personalInfo);
            aChecklist[1].completed = oCVInfo.experience && oCVInfo.experience.length > 0;
            aChecklist[2].completed = oCVInfo.education && oCVInfo.education.length > 0;
            aChecklist[3].completed = this.getTotalSkillsCount(oCVInfo.skills) >= 5;
            aChecklist[4].completed = (oUploadedDocs.identity && oUploadedDocs.identity.length > 0) && 
                                     (oUploadedDocs.education && oUploadedDocs.education.length > 0);
            aChecklist[5].completed = oCVInfo.header.completenessScore >= 80;
            
            oLocalModel.setProperty("/applicationChecklist", aChecklist);
        },

        _isPersonalInfoComplete: function (oPersonalInfo) {
            return oPersonalInfo.firstName && oPersonalInfo.lastName && 
                   oPersonalInfo.email && oPersonalInfo.phone && oPersonalInfo.location;
        },

        // Document Upload Functions
        onProfileImageChange: function (oEvent) {
            var oFileUploader = oEvent.getSource();
            var oFile = oEvent.getParameter("files") && oEvent.getParameter("files")[0];
            
            if (oFile) {
                var oLocalModel = this.getOwnerComponent().getModel("localModel");
                var oReader = new FileReader();
                
                oReader.onload = function (e) {
                    oLocalModel.setProperty("/cvInformation/header/profileImage", e.target.result);
                    MessageToast.show("Profile picture uploaded successfully");
                };
                
                oReader.readAsDataURL(oFile);
            }
        },

        onEducationDocumentChange: function (oEvent) {
            this._handleDocumentUpload(oEvent, "education", "Education document");
        },

        onIdentityDocumentChange: function (oEvent) {
            this._handleDocumentUpload(oEvent, "identity", "Identity document");
        },

        onExperienceDocumentChange: function (oEvent) {
            this._handleDocumentUpload(oEvent, "experience", "Experience document");
        },

        onOtherDocumentChange: function (oEvent) {
            this._handleDocumentUpload(oEvent, "other", "Document");
        },

        _handleDocumentUpload: function (oEvent, sCategory, sDocumentType) {
            var oFileUploader = oEvent.getSource();
            var aFiles = oEvent.getParameter("files");
            
            if (aFiles && aFiles.length > 0) {
                var oLocalModel = this.getOwnerComponent().getModel("localModel");
                var aExistingDocs = oLocalModel.getProperty("/uploadedDocuments/" + sCategory) || [];
                
                Array.from(aFiles).forEach(function (oFile) {
                    var oDocumentInfo = {
                        id: Date.now() + "_" + Math.random().toString(36).substr(2, 9),
                        fileName: oFile.name,
                        fileSize: oFile.size,
                        fileType: oFile.type,
                        uploadDate: new Date().toLocaleDateString(),
                        category: sCategory
                    };
                    
                    aExistingDocs.push(oDocumentInfo);
                });
                
                oLocalModel.setProperty("/uploadedDocuments/" + sCategory, aExistingDocs);
                this._updateApplicationChecklist();
                MessageToast.show(sDocumentType + "(s) uploaded successfully");
                
                // Clear the file uploader
                oFileUploader.clear();
            }
        },

        onDeleteDocument: function (oEvent) {
            var oContext = oEvent.getParameter("listItem").getBindingContext("localModel");
            var sPath = oContext.getPath();
            var oLocalModel = this.getOwnerComponent().getModel("localModel");
            
            MessageBox.confirm("Are you sure you want to delete this document?", {
                actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.YES) {
                        // Remove the document from the array
                        var aPathParts = sPath.split("/");
                        var iIndex = parseInt(aPathParts[aPathParts.length - 1]);
                        var sCategory = aPathParts[aPathParts.length - 2];
                        var aDocuments = oLocalModel.getProperty("/uploadedDocuments/" + sCategory);
                        
                        aDocuments.splice(iIndex, 1);
                        oLocalModel.setProperty("/uploadedDocuments/" + sCategory, aDocuments);
                        this._updateApplicationChecklist();
                        MessageToast.show("Document deleted successfully");
                    }
                }.bind(this)
            });
        },

        // Experience Management Functions
        onAddExperience: function () {
            if (!this._oExperienceDialog) {
                this._oExperienceDialog = sap.ui.xmlfragment("saphire.fragment.ExperienceDialog", this);
                this.getView().addDependent(this._oExperienceDialog);
            }
            
            // Initialize empty experience data
            var oEmptyExperience = {
                title: "",
                company: "",
                location: "",
                startDate: "",
                endDate: "",
                current: false,
                description: "",
                achievements: "",
                technologies: ""
            };
            
            var oDialogModel = new JSONModel(oEmptyExperience);
            this._oExperienceDialog.setModel(oDialogModel, "dialogModel");
            this._oExperienceDialog.setModel(new JSONModel({ editIndex: undefined }), "editModel");
            this._oExperienceDialog.open();
        },

        onEditExperience: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("localModel");
            var oExperienceData = oContext.getObject();
            
            if (!this._oExperienceDialog) {
                this._oExperienceDialog = sap.ui.xmlfragment("saphire.fragment.ExperienceDialog", this);
                this.getView().addDependent(this._oExperienceDialog);
            }
            
            var oDialogModel = new JSONModel(jQuery.extend(true, {}, oExperienceData));
            this._oExperienceDialog.setModel(oDialogModel, "dialogModel");
            this._oExperienceDialog.setModel(new JSONModel({ editIndex: oContext.getPath().split("/").pop() }), "editModel");
            this._oExperienceDialog.open();
        },

        onDeleteExperience: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("localModel");
            var sPath = oContext.getPath();
            var oLocalModel = this.getOwnerComponent().getModel("localModel");
            
            MessageBox.confirm("Are you sure you want to delete this work experience?", {
                actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.YES) {
                        var aExperience = oLocalModel.getProperty("/cvInformation/experience");
                        var iIndex = parseInt(sPath.split("/").pop());
                        aExperience.splice(iIndex, 1);
                        oLocalModel.setProperty("/cvInformation/experience", aExperience);
                        this._updateApplicationChecklist();
                        this._updateCompletenessScore();
                        MessageToast.show("Work experience deleted successfully");
                    }
                }.bind(this)
            });
        },

        // Education Management Functions
        onAddEducation: function () {
            if (!this._oEducationDialog) {
                this._oEducationDialog = sap.ui.xmlfragment("saphire.fragment.EducationDialog", this);
                this.getView().addDependent(this._oEducationDialog);
            }
            
            var oEmptyEducation = {
                degree: "",
                major: "",
                institution: "",
                startDate: "",
                endDate: "",
                gpa: "",
                achievements: "",
                coursework: ""
            };
            
            var oDialogModel = new JSONModel(oEmptyEducation);
            this._oEducationDialog.setModel(oDialogModel, "dialogModel");
            this._oEducationDialog.setModel(new JSONModel({ editIndex: undefined }), "editModel");
            this._oEducationDialog.open();
        },

        onEditEducation: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("localModel");
            var oEducationData = oContext.getObject();
            
            if (!this._oEducationDialog) {
                this._oEducationDialog = sap.ui.xmlfragment("saphire.fragment.EducationDialog", this);
                this.getView().addDependent(this._oEducationDialog);
            }
            
            var oDialogModel = new JSONModel(jQuery.extend(true, {}, oEducationData));
            this._oEducationDialog.setModel(oDialogModel, "dialogModel");
            this._oEducationDialog.setModel(new JSONModel({ editIndex: oContext.getPath().split("/").pop() }), "editModel");
            this._oEducationDialog.open();
        },

        onDeleteEducation: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("localModel");
            var sPath = oContext.getPath();
            var oLocalModel = this.getOwnerComponent().getModel("localModel");
            
            MessageBox.confirm("Are you sure you want to delete this education entry?", {
                actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.YES) {
                        var aEducation = oLocalModel.getProperty("/cvInformation/education");
                        var iIndex = parseInt(sPath.split("/").pop());
                        aEducation.splice(iIndex, 1);
                        oLocalModel.setProperty("/cvInformation/education", aEducation);
                        this._updateApplicationChecklist();
                        this._updateCompletenessScore();
                        MessageToast.show("Education entry deleted successfully");
                    }
                }.bind(this)
            });
        },

        // Project Management Functions
        onAddProject: function () {
            if (!this._oProjectDialog) {
                this._oProjectDialog = sap.ui.xmlfragment("saphire.fragment.ProjectDialog", this);
                this.getView().addDependent(this._oProjectDialog);
            }
            
            var oEmptyProject = {
                name: "",
                description: "",
                technologies: "",
                startDate: "",
                endDate: "",
                url: "",
                role: "",
                status: "Ongoing",
                achievements: ""
            };
            
            var oDialogModel = new JSONModel(oEmptyProject);
            this._oProjectDialog.setModel(oDialogModel, "dialogModel");
            this._oProjectDialog.setModel(new JSONModel({ editIndex: undefined }), "editModel");
            this._oProjectDialog.open();
        },

        onEditProject: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("localModel");
            var oProjectData = oContext.getObject();
            
            if (!this._oProjectDialog) {
                this._oProjectDialog = sap.ui.xmlfragment("saphire.fragment.ProjectDialog", this);
                this.getView().addDependent(this._oProjectDialog);
            }
            
            var oDialogModel = new JSONModel(jQuery.extend(true, {}, oProjectData));
            this._oProjectDialog.setModel(oDialogModel, "dialogModel");
            this._oProjectDialog.setModel(new JSONModel({ editIndex: oContext.getPath().split("/").pop() }), "editModel");
            this._oProjectDialog.open();
        },

        onDeleteProject: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("localModel");
            var sPath = oContext.getPath();
            var oLocalModel = this.getOwnerComponent().getModel("localModel");
            
            MessageBox.confirm("Are you sure you want to delete this project?", {
                actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.YES) {
                        var aProjects = oLocalModel.getProperty("/cvInformation/projects");
                        var iIndex = parseInt(sPath.split("/").pop());
                        aProjects.splice(iIndex, 1);
                        oLocalModel.setProperty("/cvInformation/projects", aProjects);
                        MessageToast.show("Project deleted successfully");
                    }
                }.bind(this)
            });
        },

        // Skill Management Functions
        onAddSkill: function () {
            this._showSkillDialog("programming");
        },

        onAddTechnicalSkill: function () {
            this._showSkillDialog("technical");
        },

        _showSkillDialog: function (sSkillCategory) {
            if (!this._oSkillDialog) {
                this._oSkillDialog = sap.ui.xmlfragment("saphire.fragment.SkillDialog", this);
                this.getView().addDependent(this._oSkillDialog);
            }
            
            var oEmptySkill = {
                name: "",
                level: 3,
                experience: 0,
                category: sSkillCategory
            };
            
            var oDialogModel = new JSONModel(oEmptySkill);
            this._oSkillDialog.setModel(oDialogModel, "dialogModel");
            this._oSkillDialog.open();
        },

        onDeleteSkill: function (oEvent) {
            this._deleteSkillFromCategory(oEvent, "programming");
        },

        onDeleteTechnicalSkill: function (oEvent) {
            this._deleteSkillFromCategory(oEvent, "technical");
        },

        _deleteSkillFromCategory: function (oEvent, sCategory) {
            var oContext = oEvent.getSource().getBindingContext("localModel");
            var sPath = oContext.getPath();
            var oLocalModel = this.getOwnerComponent().getModel("localModel");
            
            MessageBox.confirm("Are you sure you want to delete this skill?", {
                actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.YES) {
                        var aSkills = oLocalModel.getProperty("/cvInformation/skills/" + sCategory);
                        var iIndex = parseInt(sPath.split("/").pop());
                        aSkills.splice(iIndex, 1);
                        oLocalModel.setProperty("/cvInformation/skills/" + sCategory, aSkills);
                        this._updateApplicationChecklist();
                        this._updateCompletenessScore();
                        MessageToast.show("Skill deleted successfully");
                    }
                }.bind(this)
            });
        },

      
       _saveChanges: function () {
        var oLocalModel = this.getOwnerComponent().getModel("localModel");
        
        // Validate required fields
        if (!this._validateRequiredFields()) {
            return;
        }
        
        // Show loading state
        oLocalModel.setProperty("/busy", true);
        
        // Prepare data for backend
        var oCVInformation = oLocalModel.getProperty("/cvInformation");
        var sCandidateId = oCVInformation.candidateId;
        
        var oPayload = {
            candidateId: sCandidateId,
            cvInformation: oCVInformation
        };
        
        // Call backend to save application
        $.ajax({
            url: "/api/candidates/save-application",
            type: "POST",
            contentType: "application/json",
            data: JSON.stringify(oPayload),
            timeout: 30000,
            success: function (oData) {
                oLocalModel.setProperty("/busy", false);
                oLocalModel.setProperty("/editMode", false);
                
                // Update completeness score and checklist
                this._updateCompletenessScore();
                this._updateApplicationChecklist();
                
                MessageToast.show("Changes saved successfully!");
            }.bind(this),
            error: function (jqXHR, textStatus, errorThrown) {
                oLocalModel.setProperty("/busy", false);
                
                var sErrorMessage = "Failed to save changes. Please try again.";
                if (jqXHR.responseJSON && jqXHR.responseJSON.error) {
                    sErrorMessage = jqXHR.responseJSON.error.message || sErrorMessage;
                }
                
                MessageBox.error(sErrorMessage);
            }.bind(this)
        });
    },

    onSubmitApplication: function () {
        MessageBox.confirm("Are you sure you want to submit your application? You will not be able to edit it after submission.", {
            actions: [MessageBox.Action.YES, MessageBox.Action.NO],
            onClose: function (sAction) {
                if (sAction === MessageBox.Action.YES) {
                    this._submitFinalApplication();
                }
            }.bind(this)
        });
    },

    _submitFinalApplication: function () {
        var oLocalModel = this.getOwnerComponent().getModel("localModel");
        
        // Show loading state
        oLocalModel.setProperty("/busy", true);
        
        // Prepare data for backend
        var oCVInformation = oLocalModel.getProperty("/cvInformation");
        var sCandidateId = oCVInformation.candidateId;
        
        var oPayload = {
            candidateId: sCandidateId,
            cvInformation: oCVInformation
        };
        
        // Call backend to save application
        $.ajax({
            url: "/api/candidates/save-application",
            type: "POST",
            contentType: "application/json",
            data: JSON.stringify(oPayload),
            timeout: 30000,
            success: function (oData) {
                oLocalModel.setProperty("/busy", false);
                oLocalModel.setProperty("/applicationStatus", "Submitted");
                oLocalModel.setProperty("/editMode", false);
                
                MessageBox.success("Application submitted successfully! You will receive a confirmation email shortly.", {
                    actions: [MessageBox.Action.OK],
                    onClose: function () {
                        this.getRouter().navTo("home");
                    }.bind(this)
                });
            }.bind(this),
            error: function (jqXHR, textStatus, errorThrown) {
                oLocalModel.setProperty("/busy", false);
                
                var sErrorMessage = "Failed to submit application. Please try again.";
                if (jqXHR.responseJSON && jqXHR.responseJSON.error) {
                    sErrorMessage = jqXHR.responseJSON.error.message || sErrorMessage;
                }
                
                MessageBox.error(sErrorMessage);
            }.bind(this)
        });
    },

    onSubmitFinalApplication: function () {
        var oLocalModel = this.getOwnerComponent().getModel("localModel");
        var iCompleteness = oLocalModel.getProperty("/cvInformation/header/completenessScore");
        
        if (iCompleteness < 80) {
            MessageBox.warning("Your profile completeness is " + iCompleteness + "%. Please complete your profile to at least 80% before submitting.");
            return;
        }
        
        this._submitFinalApplication();
    },

      

            onSaveExperience: function () {
            var oDialogModel = this._oExperienceDialog.getModel("dialogModel");
            var oExperienceData = oDialogModel.getData();
            var oEditModel = this._oExperienceDialog.getModel("editModel");
            var oLocalModel = this.getOwnerComponent().getModel("localModel");
            
            // Validate required fields
            if (!oExperienceData.title || !oExperienceData.company) {
                MessageBox.error("Please fill in the required fields: Title and Company");
                return;
            }
            
            // Calculate duration
            oExperienceData.duration = this._calculateDuration(
                oExperienceData.startDate, 
                oExperienceData.endDate, 
                oExperienceData.current
            );
            
            // Process achievements and technologies as arrays
            if (oExperienceData.achievements && typeof oExperienceData.achievements === 'string') {
                oExperienceData.achievements = oExperienceData.achievements.split('\n').filter(function(item) {
                    return item.trim() !== '';
                });
            }
            
            if (oExperienceData.technologies && typeof oExperienceData.technologies === 'string') {
                oExperienceData.technologies = oExperienceData.technologies.split(',').map(function(item) {
                    return item.trim();
                }).filter(function(item) {
                    return item !== '';
                });
            }
            
            var aExperience = oLocalModel.getProperty("/cvInformation/experience") || [];
            
            if (oEditModel && oEditModel.getData().editIndex !== undefined) {
                // Edit existing experience
                var iIndex = parseInt(oEditModel.getData().editIndex);
                aExperience[iIndex] = oExperienceData;
            } else {
                // Add new experience
                oExperienceData.id = "exp_" + Date.now();
                aExperience.push(oExperienceData);
            }
            
            oLocalModel.setProperty("/cvInformation/experience", aExperience);
            this._updateApplicationChecklist();
            this._updateCompletenessScore();
            
            this._oExperienceDialog.close();
            MessageToast.show("Experience saved successfully");
        },

        onCancelExperience: function () {
            this._oExperienceDialog.close();
        },

        onSaveEducation: function () {
            var oDialogModel = this._oEducationDialog.getModel("dialogModel");
            var oEducationData = oDialogModel.getData();
            var oEditModel = this._oEducationDialog.getModel("editModel");
            var oLocalModel = this.getOwnerComponent().getModel("localModel");
            
            // Validate required fields
            if (!oEducationData.degree || !oEducationData.institution) {
                MessageBox.error("Please fill in the required fields: Degree and Institution");
                return;
            }
            
            // Process achievements as array
            if (oEducationData.achievements && typeof oEducationData.achievements === 'string') {
                oEducationData.achievements = oEducationData.achievements.split('\n').filter(function(item) {
                    return item.trim() !== '';
                });
            }
            
            var aEducation = oLocalModel.getProperty("/cvInformation/education") || [];
            
            if (oEditModel && oEditModel.getData().editIndex !== undefined) {
                // Edit existing education
                var iIndex = parseInt(oEditModel.getData().editIndex);
                aEducation[iIndex] = oEducationData;
            } else {
                // Add new education
                oEducationData.id = "edu_" + Date.now();
                aEducation.push(oEducationData);
            }
            
            oLocalModel.setProperty("/cvInformation/education", aEducation);
            this._updateApplicationChecklist();
            this._updateCompletenessScore();
            
            this._oEducationDialog.close();
            MessageToast.show("Education saved successfully");
        },

        onCancelEducation: function () {
            this._oEducationDialog.close();
        },

        onSaveProject: function () {
            var oDialogModel = this._oProjectDialog.getModel("dialogModel");
            var oProjectData = oDialogModel.getData();
            var oEditModel = this._oProjectDialog.getModel("editModel");
            var oLocalModel = this.getOwnerComponent().getModel("localModel");
            
            // Validate required fields
            if (!oProjectData.name || !oProjectData.description) {
                MessageBox.error("Please fill in the required fields: Name and Description");
                return;
            }
            
            // Process technologies and achievements as arrays
            if (oProjectData.technologies && typeof oProjectData.technologies === 'string') {
                oProjectData.technologies = oProjectData.technologies.split(',').map(function(item) {
                    return item.trim();
                }).filter(function(item) {
                    return item !== '';
                });
            }
            
            if (oProjectData.achievements && typeof oProjectData.achievements === 'string') {
                oProjectData.achievements = oProjectData.achievements.split('\n').filter(function(item) {
                    return item.trim() !== '';
                });
            }
            
            var aProjects = oLocalModel.getProperty("/cvInformation/projects") || [];
            
            if (oEditModel && oEditModel.getData().editIndex !== undefined) {
                // Edit existing project
                var iIndex = parseInt(oEditModel.getData().editIndex);
                aProjects[iIndex] = oProjectData;
            } else {
                // Add new project
                oProjectData.id = "proj_" + Date.now();
                aProjects.push(oProjectData);
            }
            
            oLocalModel.setProperty("/cvInformation/projects", aProjects);
            this._updateCompletenessScore();
            
            this._oProjectDialog.close();
            MessageToast.show("Project saved successfully");
        },

        onCancelProject: function () {
            this._oProjectDialog.close();
        },

        onSaveSkill: function () {
            var oDialogModel = this._oSkillDialog.getModel("dialogModel");
            var oSkillData = oDialogModel.getData();
            var oLocalModel = this.getOwnerComponent().getModel("localModel");
            
            // Validate required fields
            if (!oSkillData.name) {
                MessageBox.error("Please enter a skill name");
                return;
            }
            
            var sCategory = oSkillData.category;
            var aSkills = oLocalModel.getProperty("/cvInformation/skills/" + sCategory) || [];
            
            // Check for duplicates
            var bExists = aSkills.some(function(skill) {
                return skill.name.toLowerCase() === oSkillData.name.toLowerCase();
            });
            
            if (bExists) {
                MessageBox.error("This skill already exists in the " + sCategory + " category");
                return;
            }
            
            // Add new skill
            oSkillData.id = "skill_" + Date.now();
            aSkills.push(oSkillData);
            
            oLocalModel.setProperty("/cvInformation/skills/" + sCategory, aSkills);
            this._updateApplicationChecklist();
            this._updateCompletenessScore();
            
            this._oSkillDialog.close();
            MessageToast.show("Skill added successfully");
        },

        onCancelSkill: function () {
            this._oSkillDialog.close();
        },

        // Formatter functions for the view
        formatCompletenessState: function (iCompleteness) {
            if (!iCompleteness || isNaN(iCompleteness)) return "None";
            if (iCompleteness >= 80) return "Success";
            if (iCompleteness >= 60) return "Warning";
            return "Error";
        },

        formatApplicationState: function (sStatus) {
            switch (sStatus) {
                case "Submitted":
                    return "Success";
                case "In Review":
                    return "Warning";
                case "Draft":
                    return "None";
                default:
                    return "None";
            }
        },

        hasValue: function (sValue) {
            return !!(sValue && sValue.trim() !== "");
        },

        getArrayLength: function (aArray) {
            return Array.isArray(aArray) ? aArray.length : 0;
        },

        calculateTotalExperience: function (aExperience) {
            if (!Array.isArray(aExperience) || aExperience.length === 0) return "0 years";
            
            let totalMonths = 0;
            aExperience.forEach(function(exp) {
                if (exp.startDate) {
                    const startDate = this._parseMonthYear(exp.startDate);
                    const endDate = exp.current ? new Date() : (exp.endDate ? this._parseMonthYear(exp.endDate) : new Date());
                    const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                                  (endDate.getMonth() - startDate.getMonth());
                    totalMonths += Math.max(0, months);
                }
            }.bind(this));
            
            const years = Math.round(totalMonths / 12 * 10) / 10;
            return years + " years";
        },

        getTotalSkillsCount: function (oSkills) {
            if (!oSkills) return 0;
            
            var iTotal = 0;
            Object.keys(oSkills).forEach(function (sCategory) {
                if (Array.isArray(oSkills[sCategory])) {
                    iTotal += oSkills[sCategory].length;
                }
            });
            return iTotal;
        },

        formatCertificationState: function (sStatus) {
            switch (sStatus) {
                case "Valid":
                    return "Success";
                case "Expiring Soon":
                    return "Warning";
                case "Expired":
                    return "Error";
                default:
                    return "None";
            }
        },

        // Event handlers for existing functionality
        onEditPress: function () {
            MessageToast.show("Edit functionality would open an edit dialog");
        },

        onDownloadPress: function () {
            var oLocalModel = this.getOwnerComponent().getModel("localModel");
            var oCVInformation = oLocalModel.getProperty("/cvInformation");
            
            if (oCVInformation && oCVInformation.personalInfo && oCVInformation.personalInfo.firstName) {
                this._downloadCV(oCVInformation);
            } else {
                MessageToast.show("No CV data available to download");
            }
        },

        onSharePress: function () {
            MessageToast.show("Share functionality would generate a shareable link");
        },

        onExperiencePress: function (oEvent) {
            try {
                var oContext = oEvent.getSource().getBindingContext("localModel");
                if (!oContext) {
                    MessageToast.show("No experience data available");
                    return;
                }
                
                var oExperienceData = oContext.getObject();
                this._showExperienceDetails(oExperienceData);
            } catch (error) {
                console.error("Error in onExperiencePress:", error);
                MessageToast.show("Error displaying experience details");
            }
        },

        onEducationPress: function (oEvent) {
            try {
                var oContext = oEvent.getSource().getBindingContext("localModel");
                if (!oContext) {
                    MessageToast.show("No education data available");
                    return;
                }
                
                var oEducationData = oContext.getObject();
                this._showEducationDetails(oEducationData);
            } catch (error) {
                console.error("Error in onEducationPress:", error);
                MessageToast.show("Error displaying education details");
            }
        },

        onProjectPress: function (oEvent) {
            try {
                var oContext = oEvent.getSource().getBindingContext("localModel");
                if (!oContext) {
                    MessageToast.show("No project data available");
                    return;
                }
                
                var oProjectData = oContext.getObject();
                this._showProjectDetails(oProjectData);
            } catch (error) {
                console.error("Error in onProjectPress:", error);
                MessageToast.show("Error displaying project details");
            }
        },

        // Private methods
        _downloadCV: function (oCVInformation) {
            try {
                var sContent = this._generateCVText(oCVInformation);
                var sFileName = (oCVInformation.header.fullName || "CV") + "_processed.txt";
                
                var element = document.createElement('a');
                element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(sContent));
                element.setAttribute('download', sFileName);
                element.style.display = 'none';
                
                document.body.appendChild(element);
                element.click();
                document.body.removeChild(element);
                
                MessageToast.show("CV downloaded successfully");
            } catch (error) {
                console.error("Error downloading CV:", error);
                MessageBox.error("Failed to download CV: " + error.message);
            }
        },

        _generateCVText: function (oCVInformation) {
            var aContent = [];
            
            aContent.push("CURRICULUM VITAE");
            aContent.push("==================");
            aContent.push("");
            aContent.push("Name: " + (oCVInformation.header.fullName || "N/A"));
            aContent.push("Current Role: " + (oCVInformation.header.currentRole || "N/A"));
            aContent.push("Location: " + (oCVInformation.header.location || "N/A"));
            aContent.push("Email: " + (oCVInformation.personalInfo.email || "N/A"));
            aContent.push("Phone: " + (oCVInformation.personalInfo.phone || "N/A"));
            aContent.push("");

            if (oCVInformation.enhancement && oCVInformation.enhancement.profileSummary) {
                aContent.push("PROFESSIONAL SUMMARY");
                aContent.push("====================");
                aContent.push(oCVInformation.enhancement.profileSummary);
                aContent.push("");
            }

            if (oCVInformation.experience && oCVInformation.experience.length > 0) {
                aContent.push("WORK EXPERIENCE");
                aContent.push("===============");
                oCVInformation.experience.forEach(function(exp) {
                    aContent.push("");
                    aContent.push("Position: " + (exp.title || "N/A"));
                    aContent.push("Company: " + (exp.company || "N/A"));
                    aContent.push("Duration: " + (exp.duration || "N/A"));
                    if (exp.description) {
                        aContent.push("Description: " + exp.description);
                    }
                });
                aContent.push("");
            }

            if (oCVInformation.education && oCVInformation.education.length > 0) {
                aContent.push("EDUCATION");
                aContent.push("=========");
                oCVInformation.education.forEach(function(edu) {
                    aContent.push("");
                    aContent.push("Degree: " + (edu.degree || "N/A"));
                    aContent.push("Institution: " + (edu.institution || "N/A"));
                    if (edu.gpa) {
                        aContent.push("GPA: " + edu.gpa);
                    }
                });
                aContent.push("");
            }

            return aContent.join("\n");
        },

        _showExperienceDetails: function (oExperienceData) {
            if (!oExperienceData) {
                MessageToast.show("No experience data available");
                return;
            }
            
            var sDetails = "Position: " + (oExperienceData.title || "N/A") + "\n" +
                          "Company: " + (oExperienceData.company || "N/A") + "\n" +
                          "Duration: " + (oExperienceData.duration || "N/A");

            if (oExperienceData.description) {
                sDetails += "\n\nDescription:\n" + oExperienceData.description;
            }

            if (oExperienceData.achievements && Array.isArray(oExperienceData.achievements) && oExperienceData.achievements.length > 0) {
                sDetails += "\n\nKey Achievements:\n• " + oExperienceData.achievements.join("\n• ");
            }

            if (oExperienceData.technologies && Array.isArray(oExperienceData.technologies) && oExperienceData.technologies.length > 0) {
                sDetails += "\n\nTechnologies: " + oExperienceData.technologies.join(", ");
            }

            MessageBox.information(sDetails, {
                title: "Experience Details",
                contentWidth: "600px"
            });
        },

        _showEducationDetails: function (oEducationData) {
            if (!oEducationData) {
                MessageToast.show("No education data available");
                return;
            }
            
            var sDetails = "Degree: " + (oEducationData.degree || "N/A") + "\n" +
                          "Institution: " + (oEducationData.institution || "N/A") + "\n" +
                          "Duration: " + (oEducationData.startDate || "") + " - " + (oEducationData.endDate || "");

            if (oEducationData.major) {
                sDetails += "\nMajor: " + oEducationData.major;
            }

            if (oEducationData.gpa) {
                sDetails += "\nGPA: " + oEducationData.gpa;
            }

            if (oEducationData.coursework) {
                sDetails += "\n\nRelevant Coursework:\n" + oEducationData.coursework;
            }

            if (oEducationData.achievements && Array.isArray(oEducationData.achievements) && oEducationData.achievements.length > 0) {
                sDetails += "\n\nAchievements:\n• " + oEducationData.achievements.join("\n• ");
            }

            MessageBox.information(sDetails, {
                title: "Education Details",
                contentWidth: "600px"
            });
        },

        _showProjectDetails: function (oProjectData) {
            if (!oProjectData) {
                MessageToast.show("No project data available");
                return;
            }
            
            var sDetails = "Project: " + (oProjectData.name || "N/A") + "\n" +
                          "Status: " + (oProjectData.status || "N/A");

            if (oProjectData.role) {
                sDetails += "\nRole: " + oProjectData.role;
            }

            if (oProjectData.startDate || oProjectData.endDate) {
                sDetails += "\nDuration: " + (oProjectData.startDate || "") + " - " + (oProjectData.endDate || "Present");
            }

            if (oProjectData.description) {
                sDetails += "\n\nDescription:\n" + oProjectData.description;
            }

            if (oProjectData.technologies && Array.isArray(oProjectData.technologies) && oProjectData.technologies.length > 0) {
                sDetails += "\n\nTechnologies: " + oProjectData.technologies.join(", ");
            }

            if (oProjectData.achievements && Array.isArray(oProjectData.achievements) && oProjectData.achievements.length > 0) {
                sDetails += "\n\nKey Features/Achievements:\n• " + oProjectData.achievements.join("\n• ");
            }

            if (oProjectData.url) {
                sDetails += "\n\nProject URL: " + oProjectData.url;
            }

            MessageBox.information(sDetails, {
                title: "Project Details",
                contentWidth: "600px"
            });
        },

        // Date handling for MM-YYYY format
        _calculateDuration: function(startDate, endDate, isCurrent) {
            if (!startDate) return "";
            
            var start = this._parseMonthYear(startDate);
            var end = isCurrent ? new Date() : (endDate ? this._parseMonthYear(endDate) : new Date());
            
            var months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
            
            if (months <= 0) return "Less than 1 month";
            
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

        _parseMonthYear: function(dateString) {
            // Handle MM-YYYY format
            if (dateString && typeof dateString === 'string' && dateString.includes('-')) {
                var parts = dateString.split('-');
                if (parts.length === 2) {
                    var month = parseInt(parts[0]) - 1; // JavaScript months are 0-based
                    var year = parseInt(parts[1]);
                    return new Date(year, month, 1);
                }
            }
            
            return new Date(dateString);
        },

        // Navigation
        onNavBack: function () {
            var oHistory = History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();

            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                this.getRouter().navTo("cvverification", {}, true);
            }
        }
    });
});