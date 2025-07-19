const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const pdf = require('pdf-parse');

class CVProcessingUtils {

  async extractTextFromFile(filePath, fileType) {
    try {
      switch (fileType) {
        case 'application/pdf':
          return await this.extractFromPDF(filePath);
        case 'application/msword':
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          return await this.extractFromDocx(filePath);
        case 'text/plain':
          return await this.extractFromText(filePath);
        default:
          throw new Error(`Unsupported file type: ${fileType}`);
      }
    } catch (error) {
      console.error('Error extracting text from file:', error);
      throw error;
    }
  }

  async extractFromPDF(filePath) {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
  }

  async extractFromDocx(filePath) {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }

  async extractFromText(filePath) {
    return fs.readFileSync(filePath, 'utf8');
  }

  // Updated parseCV method to work with CallAI service
  async parseCV(text, callAI) {
    try {
      // First pass - extract basic structure
      const structurePrompt = `
      Extract structured information from this CV/Resume. Return only valid JSON:

      CV Text:
      ${text.substring(0, 8000)}

      Return JSON with this exact structure:
      {
        "personalInfo": {
          "firstName": "",
          "lastName": "",
          "email": "",
          "phone": "",
          "location": "",
          "summary": "",
          "linkedIn": "",
          "portfolio": "",
          "github": ""
        },
        "education": [
          {
            "degree": "",
            "major": "",
            "institution": "",
            "startDate": "",
            "endDate": "",
            "gpa": "",
            "achievements": [],
            "coursework": ""
          }
        ],
        "experience": [
          {
            "title": "",
            "company": "",
            "location": "",
            "startDate": "",
            "endDate": "",
            "current": false,
            "description": "",
            "achievements": [],
            "technologies": []
          }
        ],
        "skills": {
          "technical": [],
          "programming": [],
          "frameworks": [],
          "tools": [],
          "languages": [],
          "soft": []
        },
        "projects": [
          {
            "name": "",
            "description": "",
            "technologies": [],
            "startDate": "",
            "endDate": "",
            "url": "",
            "role": ""
          }
        ],
        "certifications": [
          {
            "name": "",
            "issuer": "",
            "date": "",
            "expiryDate": "",
            "credentialId": ""
          }
        ],
        "languages": [
          {
            "language": "",
            "proficiency": ""
          }
        ]
      }
      `;

      const systemPrompt = 'You are an expert CV parser. Extract information accurately and return only valid JSON.';
      
      const structuredResult = await callAI.llm(structurePrompt, systemPrompt);

      // Clean and parse JSON response
      let cleanResponse = structuredResult.replace(/```json|```/g, '').trim();
      
      // Remove any text before the first {
      const firstBrace = cleanResponse.indexOf('{');
      if (firstBrace > 0) {
        cleanResponse = cleanResponse.substring(firstBrace);
      }

      // Remove any text after the last }
      const lastBrace = cleanResponse.lastIndexOf('}');
      if (lastBrace > 0) {
        cleanResponse = cleanResponse.substring(0, lastBrace + 1);
      }

      let parsedData;
      try {
        parsedData = JSON.parse(cleanResponse);
      } catch (parseError) {
        console.error('Error parsing structured JSON:', parseError);
        console.log('Raw response:', cleanResponse);
        parsedData = this.getDefaultCVStructure();
      }

      // Second pass - enhance with additional details
      const enhancementPrompt = `
      Based on this CV text, provide additional insights:
      ${text.substring(0, 4000)}

      Return JSON with:
      {
        "profileSummary": "Brief professional summary",
        "keyStrengths": ["strength1", "strength2"],
        "careerLevel": "junior|mid|senior|executive",
        "industryExperience": ["industry1", "industry2"],
        "salaryExpectation": "estimated range if mentioned",
        "availability": "when can start",
        "keywords": ["keyword1", "keyword2"]
      }
      `;

      let enhancementData = {};
      try {
        const enhancementResult = await callAI.llm(enhancementPrompt, 'You are a helpful assistant that provides insights about candidates.');

        const cleanEnhancement = enhancementResult.replace(/```json|```/g, '').trim();
        
        // Clean enhancement response similar to main response
        const enhancementFirstBrace = cleanEnhancement.indexOf('{');
        const enhancementLastBrace = cleanEnhancement.lastIndexOf('}');
        
        if (enhancementFirstBrace >= 0 && enhancementLastBrace > enhancementFirstBrace) {
          const cleanEnhancementJson = cleanEnhancement.substring(enhancementFirstBrace, enhancementLastBrace + 1);
          enhancementData = JSON.parse(cleanEnhancementJson);
        }
      } catch (e) {
        console.log('Enhancement parsing failed, using defaults:', e.message);
        enhancementData = {
          profileSummary: `Professional with experience in ${parsedData.experience?.[0]?.title || 'various roles'}`,
          keyStrengths: [],
          careerLevel: "mid",
          industryExperience: [],
          salaryExpectation: "",
          availability: "Available",
          keywords: []
        };
      }

      return {
        ...parsedData,
        enhancement: enhancementData
      };

    } catch (error) {
      console.error('Error in CV parsing:', error);
      return this.getDefaultCVStructure();
    }
  }

  getDefaultCVStructure() {
    return {
      personalInfo: {
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        location: "",
        summary: "",
        linkedIn: "",
        portfolio: "",
        github: ""
      },
      education: [],
      experience: [],
      skills: { 
        technical: [], 
        programming: [], 
        frameworks: [], 
        tools: [], 
        languages: [], 
        soft: [] 
      },
      projects: [],
      certifications: [],
      languages: [],
      enhancement: {
        profileSummary: "",
        keyStrengths: [],
        careerLevel: "mid",
        industryExperience: [],
        salaryExpectation: "",
        availability: "Available",
        keywords: []
      }
    };
  }

  calculateCompletenessScore(parsedData) {
    let score = 0;
    const weights = {
      personalInfo: 20,
      education: 15,
      experience: 25,
      skills: 20,
      projects: 10,
      certifications: 5,
      languages: 5
    };

    // Personal Info scoring
    if (parsedData.personalInfo) {
      const personalFields = ['firstName', 'lastName', 'email', 'phone', 'summary'];
      const filledFields = personalFields.filter(field => 
        parsedData.personalInfo[field] && parsedData.personalInfo[field].trim() !== ''
      );
      score += (filledFields.length / personalFields.length) * weights.personalInfo;
    }

    // Education scoring
    if (parsedData.education && parsedData.education.length > 0) {
      const hasValidEducation = parsedData.education.some(edu => 
        edu.degree && edu.degree.trim() !== '' && edu.institution && edu.institution.trim() !== ''
      );
      if (hasValidEducation) score += weights.education;
    }

    // Experience scoring
    if (parsedData.experience && parsedData.experience.length > 0) {
      const hasValidExperience = parsedData.experience.some(exp => 
        exp.title && exp.title.trim() !== '' && exp.company && exp.company.trim() !== ''
      );
      if (hasValidExperience) score += weights.experience;
    }

    // Skills scoring
    if (parsedData.skills) {
      const skillCategories = Object.values(parsedData.skills).flat();
      const validSkills = skillCategories.filter(skill => 
        (typeof skill === 'string' && skill.trim() !== '') || 
        (typeof skill === 'object' && skill.name && skill.name.trim() !== '')
      );
      if (validSkills.length > 0) {
        score += weights.skills;
      }
    }

    // Projects scoring
    if (parsedData.projects && parsedData.projects.length > 0) {
      const hasValidProjects = parsedData.projects.some(project => 
        project.name && project.name.trim() !== ''
      );
      if (hasValidProjects) score += weights.projects;
    }

    // Certifications scoring
    if (parsedData.certifications && parsedData.certifications.length > 0) {
      const hasValidCertifications = parsedData.certifications.some(cert => 
        cert.name && cert.name.trim() !== ''
      );
      if (hasValidCertifications) score += weights.certifications;
    }

    // Languages scoring
    if (parsedData.languages && parsedData.languages.length > 0) {
      const hasValidLanguages = parsedData.languages.some(lang => 
        lang.language && lang.language.trim() !== ''
      );
      if (hasValidLanguages) score += weights.languages;
    }

    return Math.round(score);
  }

  extractKeywords(parsedData, resumeText) {
    const keywords = new Set();

    // Extract from skills
    if (parsedData.skills) {
      Object.values(parsedData.skills).flat().forEach(skill => {
        if (typeof skill === 'string' && skill.trim() !== '') {
          keywords.add(skill.toLowerCase().trim());
        } else if (skill && skill.name && skill.name.trim() !== '') {
          keywords.add(skill.name.toLowerCase().trim());
        }
      });
    }

    // Extract from job titles and companies
    if (parsedData.experience) {
      parsedData.experience.forEach(exp => {
        if (exp.title && exp.title.trim() !== '') {
          keywords.add(exp.title.toLowerCase().trim());
        }
        if (exp.company && exp.company.trim() !== '') {
          keywords.add(exp.company.toLowerCase().trim());
        }
        // Extract from technologies used
        if (exp.technologies && Array.isArray(exp.technologies)) {
          exp.technologies.forEach(tech => {
            if (tech && tech.trim() !== '') {
              keywords.add(tech.toLowerCase().trim());
            }
          });
        }
      });
    }

    // Extract from education
    if (parsedData.education) {
      parsedData.education.forEach(edu => {
        if (edu.degree && edu.degree.trim() !== '') {
          keywords.add(edu.degree.toLowerCase().trim());
        }
        if (edu.major && edu.major.trim() !== '') {
          keywords.add(edu.major.toLowerCase().trim());
        }
        if (edu.institution && edu.institution.trim() !== '') {
          keywords.add(edu.institution.toLowerCase().trim());
        }
      });
    }

    // Extract from projects
    if (parsedData.projects) {
      parsedData.projects.forEach(project => {
        if (project.technologies && Array.isArray(project.technologies)) {
          project.technologies.forEach(tech => {
            if (tech && tech.trim() !== '') {
              keywords.add(tech.toLowerCase().trim());
            }
          });
        }
      });
    }

    // Extract from enhancement keywords
    if (parsedData.enhancement && parsedData.enhancement.keywords) {
      parsedData.enhancement.keywords.forEach(keyword => {
        if (keyword && keyword.trim() !== '') {
          keywords.add(keyword.toLowerCase().trim());
        }
      });
    }

    return Array.from(keywords).join(', ');
  }

  async generateProfileSummary(parsedData, resumeText, callAI) {
    try {
      const summaryPrompt = `
      Create a professional 2-3 sentence summary for this candidate based on their CV:
      
      Name: ${parsedData.personalInfo?.firstName} ${parsedData.personalInfo?.lastName}
      Experience: ${parsedData.experience?.length || 0} positions
      Skills: ${Object.values(parsedData.skills || {}).flat().slice(0, 10).join(', ')}
      Education: ${parsedData.education?.map(e => e.degree).join(', ')}
      
      Make it engaging and highlight key strengths. Return only the summary text without any additional formatting.
      `;

      const systemPrompt = 'You are a professional resume writer. Create compelling candidate summaries.';
      const summary = await callAI.llm(summaryPrompt, systemPrompt);

      return summary.trim();
    } catch (error) {
      console.error('Error generating summary:', error);
      return `Experienced professional with background in ${parsedData.experience?.[0]?.title || 'various roles'}.`;
    }
  }

  categorizeSkills(skills) {
    const categories = {
      programming: ['javascript', 'python', 'java', 'c++', 'c#', 'php', 'ruby', 'go', 'rust', 'typescript', 'scala', 'kotlin'],
      frameworks: ['react', 'angular', 'vue', 'express', 'django', 'spring', 'laravel', 'rails', 'flask', 'fastapi', 'nestjs'],
      databases: ['mysql', 'postgresql', 'mongodb', 'oracle', 'sqlite', 'redis', 'cassandra', 'dynamodb'],
      cloud: ['aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'helm', 'openshift'],
      tools: ['git', 'jira', 'jenkins', 'gradle', 'maven', 'webpack', 'npm', 'yarn', 'ansible'],
      soft: ['leadership', 'communication', 'teamwork', 'problem solving', 'analytical', 'management', 'coordination']
    };

    const categorized = {
      programming: [],
      frameworks: [],
      databases: [],
      cloud: [],
      tools: [],
      soft: [],
      other: []
    };

    skills.forEach(skill => {
      const skillLower = typeof skill === 'string' ? skill.toLowerCase() : (skill.name || '').toLowerCase();
      let categorized_flag = false;

      for (const [category, keywords] of Object.entries(categories)) {
        if (keywords.some(keyword => skillLower.includes(keyword))) {
          categorized[category].push(typeof skill === 'string' ? skill : skill.name);
          categorized_flag = true;
          break;
        }
      }

      if (!categorized_flag) {
        categorized.other.push(typeof skill === 'string' ? skill : skill.name);
      }
    });

    return categorized;
  }

  validateParsedData(parsedData) {
    const errors = [];
    const warnings = [];
    
    if (!parsedData.personalInfo?.firstName || parsedData.personalInfo.firstName.trim() === '') {
      errors.push('First name is missing');
    }
    
    if (!parsedData.personalInfo?.email || parsedData.personalInfo.email.trim() === '') {
      warnings.push('Email is missing');
    }
    
    if (!parsedData.experience || parsedData.experience.length === 0) {
      errors.push('No work experience found');
    } else {
      const validExperience = parsedData.experience.filter(exp => 
        exp.title && exp.title.trim() !== '' && exp.company && exp.company.trim() !== ''
      );
      if (validExperience.length === 0) {
        errors.push('No valid work experience found');
      }
    }
    
    if (!parsedData.skills || Object.values(parsedData.skills).flat().length === 0) {
      warnings.push('No skills found');
    } else {
      const validSkills = Object.values(parsedData.skills).flat().filter(skill => 
        (typeof skill === 'string' && skill.trim() !== '') || 
        (typeof skill === 'object' && skill.name && skill.name.trim() !== '')
      );
      if (validSkills.length === 0) {
        warnings.push('No valid skills found');
      }
    }

    // Additional validations
    if (!parsedData.education || parsedData.education.length === 0) {
      warnings.push('No education information found');
    }

    if (!parsedData.personalInfo?.phone || parsedData.personalInfo.phone.trim() === '') {
      warnings.push('Phone number is missing');
    }

    return {
      isValid: errors.length === 0,
      errors: errors,
      warnings: warnings,
      errorCount: errors.length,
      warningCount: warnings.length
    };
  }

  cleanupTempFiles(uploadDir = './uploads', maxAge = 3600000) { // 1 hour
    try {
      if (!fs.existsSync(uploadDir)) return;

      const files = fs.readdirSync(uploadDir);
      const now = Date.now();

      files.forEach(file => {
        const filePath = path.join(uploadDir, file);
        const stats = fs.statSync(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(filePath);
          console.log(`Cleaned up old file: ${file}`);
        }
      });
    } catch (error) {
      console.error('Error cleaning up temp files:', error);
    }
  }

  // Helper method to sanitize text for better AI parsing
  sanitizeTextForAI(text) {
    try {
      // Remove excessive whitespace and normalize line breaks
      let sanitized = text.replace(/\s+/g, ' ').trim();
      
      // Remove common PDF artifacts
      sanitized = sanitized.replace(/\f/g, '\n'); // Form feed to newline
      sanitized = sanitized.replace(/\r\n/g, '\n'); // Windows line endings
      sanitized = sanitized.replace(/\r/g, '\n'); // Mac line endings
      
      // Normalize multiple newlines
      sanitized = sanitized.replace(/\n{3,}/g, '\n\n');
      
      // Remove page numbers and common headers/footers
      sanitized = sanitized.replace(/^Page \d+ of \d+$/gm, '');
      sanitized = sanitized.replace(/^\d+$/gm, ''); // Stand-alone numbers
      
      return sanitized;
    } catch (error) {
      console.error('Error sanitizing text:', error);
      return text; // Return original if sanitization fails
    }
  }

  // Helper method to validate email format
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Helper method to validate phone format
  isValidPhone(phone) {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  }

  // Helper method to estimate processing confidence
  calculateProcessingConfidence(parsedData, originalTextLength) {
    let confidence = 0;
    
    // Base confidence on data completeness
    const completeness = this.calculateCompletenessScore(parsedData);
    confidence += completeness * 0.6; // 60% weight for completeness
    
    // Add confidence based on data quality
    let qualityScore = 0;
    
    // Personal info quality
    if (parsedData.personalInfo) {
      if (this.isValidEmail(parsedData.personalInfo.email || '')) qualityScore += 10;
      if (this.isValidPhone(parsedData.personalInfo.phone || '')) qualityScore += 10;
      if (parsedData.personalInfo.firstName && parsedData.personalInfo.lastName) qualityScore += 10;
    }
    
    // Experience quality
    if (parsedData.experience && parsedData.experience.length > 0) {
      const validExperience = parsedData.experience.filter(exp => 
        exp.title && exp.company && exp.startDate
      );
      qualityScore += Math.min(20, validExperience.length * 5);
    }
    
    confidence += qualityScore * 0.4; // 40% weight for quality
    
    return Math.min(100, Math.round(confidence));
  }

  // Helper method to extract dates in various formats
  extractDate(dateString) {
    if (!dateString) return null;
    
    try {
      // Handle various date formats
      const datePatterns = [
        /(\d{1,2})\/(\d{1,2})\/(\d{4})/,  // MM/DD/YYYY or DD/MM/YYYY
        /(\d{4})-(\d{1,2})-(\d{1,2})/,    // YYYY-MM-DD
        /(\w+)\s+(\d{4})/,                // Month YYYY
        /(\d{1,2})\/(\d{4})/,             // MM/YYYY
        /(\d{4})/                         // YYYY
      ];
      
      for (const pattern of datePatterns) {
        const match = dateString.match(pattern);
        if (match) {
          // Return standardized date format
          const date = new Date(dateString);
          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0]; // YYYY-MM-DD format
          }
        }
      }
      
      return dateString; // Return original if no pattern matches
    } catch (error) {
      console.error('Error extracting date:', error);
      return dateString;
    }
  }

  // Helper method to standardize skill names
  standardizeSkillName(skillName) {
    if (!skillName || typeof skillName !== 'string') return skillName;
    
    const skillMappings = {
      'js': 'JavaScript',
      'ts': 'TypeScript',
      'py': 'Python',
      'node': 'Node.js',
      'react.js': 'React',
      'vue.js': 'Vue.js',
      'angular.js': 'AngularJS',
      'c++': 'C++',
      'c#': 'C#',
      '.net': '.NET',
      'mysql': 'MySQL',
      'postgresql': 'PostgreSQL',
      'mongodb': 'MongoDB'
    };
    
    const normalized = skillName.toLowerCase().trim();
    return skillMappings[normalized] || skillName.trim();
  }
}

module.exports = CVProcessingUtils;