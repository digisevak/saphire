const cds = require("@sap/cds");
const compression = require("compression");
var bodyParser = require('body-parser')
const cov2ap = require("@sap/cds-odata-v2-adapter-proxy");
const axios = require('axios'); 
const CVProcessingUtils = require('./api/parseCV');
const CallAI = require('./api/callAI'); // Your CallAI service
const { TextLoader } = require('langchain/document_loaders/fs/text');
const { PDFLoader } = require('@langchain/community/document_loaders/fs/pdf');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const path = require('path');
const fs = require('fs');

// Helper method to convert embeddings to buffer for HANA Vector type
let array2VectorBuffer = (data) => {
  try {
    // For HANA Vector type, we need to create a proper vector buffer
    // HANA expects vectors in a specific binary format
    const dimensions = data.length;
    const vectorBuffer = Buffer.alloc(4 + dimensions * 4);
    
    // Write the number of dimensions as the first 4 bytes (little endian)
    vectorBuffer.writeUInt32LE(dimensions, 0);
    
    // Write each float value (little endian)
    for (let i = 0; i < dimensions; i++) {
      vectorBuffer.writeFloatLE(data[i], 4 + i * 4);
    }
    
    console.log(`Created vector buffer for ${dimensions} dimensions, size: ${vectorBuffer.length} bytes`);
    return vectorBuffer;
  } catch (error) {
    console.error('Error creating vector buffer:', error);
    throw error;
  }
};

// Helper method to delete file if it already exists
let deleteIfExists = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('File deleted successfully');
    }
  } catch (unlinkErr) {
    console.error('Error occurred while attempting to delete file:', unlinkErr);
  }
};

// Helper method to convert base64 to file
let base64ToFile = (base64Data, fileName, uploadDir = './uploads') => {
  try {
    // Ensure upload directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Remove data URL prefix if present
    const base64Content = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    
    // Create buffer from base64
    const buffer = Buffer.from(base64Content, 'base64');
    
    // Create file path
    const filePath = path.join(uploadDir, fileName);
    
    // Write file
    fs.writeFileSync(filePath, buffer);
    
    return filePath;
  } catch (error) {
    console.error('Error converting base64 to file:', error);
    throw error;
  }
};

cds.on('bootstrap', (app) => {
    app.use(cov2ap());
    app.use(bodyParser.json({ limit: '50mb' }));
    app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
    app.use(compression({
      chunkSize: 2 * 1024
    }));
});

cds.on('served', () => {
  const app = cds.app;

  app.post('/api/candidates/upload-document', async (req, res) => {
    let tempFilePath = null;
    
    try {
      const {
        candidateId,
        fileName,
        fileType,
        fileSize,
        fileContent,
        uploadedAt,
        consentGiven,
        documentType
      } = req.body;

      console.log(`Processing CV upload for candidate: ${candidateId}`);

      // Validate required fields
      if (!candidateId || !fileName || !fileContent) {
        return res.status(400).json({
          error: { message: 'Missing required fields: candidateId, fileName, or fileContent' }
        });
      }

      // Initialize CV processing utils and CallAI service
      const cvProcessingUtils = new CVProcessingUtils();
      const callAI = new CallAI(); // Use CallAI directly

      // Convert base64 to file
      const timestamp = Date.now();
      const sanitizedFileName = `${candidateId}_${timestamp}_${fileName}`;
      tempFilePath = base64ToFile(fileContent, sanitizedFileName);

      console.log('File saved to:', tempFilePath);

      // Extract text from file using CVProcessingUtils
      console.log('Extracting text from file...');
      const extractedText = await cvProcessingUtils.extractTextFromFile(tempFilePath, fileType);
      console.log('Text extracted, length:', extractedText.length);

      // Parse CV using CVProcessingUtils with CallAI service
      console.log('Parsing CV with AI...');
      const parsedCV = await cvProcessingUtils.parseCV(extractedText, callAI);
      console.log('CV parsed successfully');

      // Create document for chunking (using LangChain loaders for consistency)
      let loader;
      if (fileType === 'application/pdf') {
        loader = new PDFLoader(tempFilePath);
      } else {
        loader = new TextLoader(tempFilePath);
      }

      const document = await loader.load();
      const fullText = document.map(doc => doc.pageContent).join('\n');

      // Create text chunks for embedding using LangChain splitter
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 500,
        chunkOverlap: 50,
        addStartIndex: true
      });

      const textChunks = await splitter.splitDocuments(document);
      console.log(`Document split into ${textChunks.length} chunks`);

      // Generate embeddings using CallAI service directly
      console.log('Generating embeddings with CallAI...');
      let textChunkEntries = [];
      
      // for (const chunk of textChunks) {
      //   try {
      //     const embeddingResponse = await callAI.embedding(chunk.pageContent);
      //     console.log('Embedding response structure:', typeof embeddingResponse, Array.isArray(embeddingResponse));
          
      //     // Handle the response structure - it returns {data: [embedding_array]}
      //     let embedding;
      //     if (embeddingResponse && embeddingResponse.data && Array.isArray(embeddingResponse.data)) {
      //       embedding = embeddingResponse.data;
      //     } else if (Array.isArray(embeddingResponse)) {
      //       embedding = embeddingResponse[0];
      //     } else {
      //       console.warn('Unexpected embedding response format:', embeddingResponse);
      //       continue;
      //     }
          
      //     if (embedding && Array.isArray(embedding) && embedding.length > 0) {
      //       textChunkEntries.push({
      //         text_chunk: chunk.pageContent,
      //         metadata_column: `${candidateId}_${fileName}`,
      //         embedding: array2VectorBuffer(embedding),
      //         candidate_id: candidateId
      //       });
      //       console.log(`Added chunk embedding with ${embedding.length} dimensions`);
      //     } else {
      //       console.warn('Invalid embedding received for chunk, skipping...');
      //     }
      //   } catch (embeddingError) {
      //     console.error('Error generating embedding for chunk:', embeddingError);
      //     // Continue with other chunks even if one fails
      //   }
      // }

      // console.log('Generating full resume embedding...');
      // const resumeEmbeddingResponse = await callAI.embedding(fullText);
      
      // let resumeEmbedding;
      // if (resumeEmbeddingResponse && resumeEmbeddingResponse.data && Array.isArray(resumeEmbeddingResponse.data)) {
      //   resumeEmbedding = resumeEmbeddingResponse.data;
      // } else if (Array.isArray(resumeEmbeddingResponse)) {
      //   resumeEmbedding = resumeEmbeddingResponse[0];
      // } else {
      //   throw new Error('Invalid resume embedding response format');
      // }
      
      // if (!Array.isArray(resumeEmbedding) || resumeEmbedding.length === 0) {
      //   throw new Error('Resume embedding is not a valid array');
      // }
      
      // console.log(`Resume embedding dimensions: ${resumeEmbedding.length}`);
      // const resumeVector = array2VectorBuffer(resumeEmbedding);

      const db = await cds.connect.to('db');
      const { SeekerProfile } = cds.entities('saphire.hire');
      
      console.log('Checking if seeker profile exists...');
      let seekerProfile = await db.run(
        cds.ql.SELECT.from(SeekerProfile).where({ user_account_ID: candidateId })
      );

      const profileData = {
        resume_text: fullText,
        ai_parsed_data: JSON.stringify(parsedCV),
        parsing_confidence: 92,
        cv_completeness: cvProcessingUtils.calculateCompletenessScore(parsedCV),
        keywords: cvProcessingUtils.extractKeywords(parsedCV, fullText),
        last_cv_update: new Date().toISOString(),
        modifiedAt: new Date().toISOString()
      };

      // if (resumeVector && resumeVector.length > 0) {
      //   profileData.resume_vector = resumeVector;
      //   console.log('Added resume vector to profile data');
      // } else {
      //   console.warn('Resume vector is invalid, skipping vector storage');
      // }

      if (seekerProfile.length > 0) {
        console.log('Updating existing seeker profile...');
        await db.run(
          cds.ql.UPDATE(SeekerProfile)
            .set(profileData)
            .where({ user_account_ID: candidateId })
        );
        console.log('Updated existing seeker profile');
      } else {

        console.log('Creating new seeker profile...');
        const newProfileData = {
          user_account_ID: candidateId,
          first_name: parsedCV.personalInfo?.firstName || '',
          last_name: parsedCV.personalInfo?.lastName || '',
          current_salary: null,
          is_annually_monthly: 'A',
          currency: 'USD',
          ...profileData
        };

        await db.run(
          cds.ql.INSERT.into(SeekerProfile).entries(newProfileData)
        );
        console.log('Created new seeker profile');
      }

      // Store document chunks for vector search (commented out as requested)
      /*
      const { DocumentChunk } = cds.entities('saphire.hire');
      if (textChunkEntries.length > 0) {
        console.log('Storing document chunks...');
        await db.run(cds.ql.INSERT.into(DocumentChunk).entries(textChunkEntries));
        console.log(`Stored ${textChunkEntries.length} document chunks`);
      }
      */

      // CAP-LLM plugin code commented out as requested
      /*
      console.log('Connecting to vector plugin for embeddings...');
      const vectorPlugin = await cds.connect.to('cap-llm-plugin');

      let textChunkEntries = [];
      for (const chunk of textChunks) {
        const embedding = await vectorPlugin.getEmbedding(chunk.pageContent);
        textChunkEntries.push({
          text_chunk: chunk.pageContent,
          metadata_column: `${candidateId}_${fileName}`,
          embedding: array2VectorBuffer(embedding),
          candidate_id: candidateId
        });
      }

      // Generate full resume embedding using vector plugin
      const resumeEmbedding = await vectorPlugin.getEmbedding(fullText);
      const resumeVector = array2VectorBuffer(resumeEmbedding);
      */

      // Clean up temporary file
      if (tempFilePath) {
        deleteIfExists(tempFilePath);
      }

      // Calculate additional metrics
      const completenessScore = cvProcessingUtils.calculateCompletenessScore(parsedCV);
      const validation = cvProcessingUtils.validateParsedData(parsedCV);

      // Return success response with parsed CV data
      res.status(200).json({
        success: true,
        documentId: `${candidateId}_${timestamp}`,
        message: 'CV processed successfully',
        parsedData: parsedCV,
        metrics: {
          textChunks: textChunks.length,
          completenessScore: completenessScore,
          validation: validation,
          processingTime: new Date().toISOString(),
          textLength: fullText.length,
          embeddingsGenerated: textChunkEntries.length
        },
        processingDetails: {
          fileProcessed: true,
          aiParsingCompleted: true,
          embeddingsGenerated: true,
          profileUpdated: true,
          chunksProcessed: textChunkEntries.length
        }
      });

    } catch (error) {
      console.error('Error processing CV upload:', error);
      
      // Clean up temporary file on error
      if (tempFilePath) {
        deleteIfExists(tempFilePath);
      }

      res.status(500).json({
        error: {
          message: 'Failed to process CV upload',
          details: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }
      });
    }
  });



   app.post('/api/candidates/save-application', async (req, res) => {
    try {
      const { candidateId, cvInformation } = req.body;

      console.log(`Saving application for candidate: ${candidateId}`);

      // Validate required fields
      if (!candidateId || !cvInformation) {
        return res.status(400).json({
          error: { message: 'Missing required fields: candidateId or cvInformation' }
        });
      }

      const db = await cds.connect.to('db');
      const { 
        SeekerProfile, 
        EducationDetail, 
        ExperienceDetail, 
        SeekerSkillSet,
        SkillSet,
        UserAccount 
      } = cds.entities('saphire.hire');

      // Start transaction
      await db.tx(async (tx) => {
        
        // 1. Update SeekerProfile
        const profileUpdateData = {
          first_name: cvInformation.personalInfo.firstName,
          last_name: cvInformation.personalInfo.lastName,
          current_salary: cvInformation.personalInfo.currentSalary || null,
          currency: cvInformation.personalInfo.currency || 'USD',
          resume_text: cvInformation.enhancement?.profileSummary || '',
          modifiedAt: new Date().toISOString()
        };

        await tx.run(
          cds.ql.UPDATE(SeekerProfile)
            .set(profileUpdateData)
            .where({ user_account_ID: candidateId })
        );

        // Get seeker profile ID
        const seekerProfile = await tx.run(
          cds.ql.SELECT.from(SeekerProfile).where({ user_account_ID: candidateId })
        );
        const seekerProfileId = seekerProfile[0].ID;

        // 2. Update UserAccount
        await tx.run(
          cds.ql.UPDATE(UserAccount)
            .set({
              email: cvInformation.personalInfo.email,
              phone: cvInformation.personalInfo.phone,
              modifiedAt: new Date().toISOString()
            })
            .where({ ID: candidateId })
        );

        // 3. Handle Education Details
        if (cvInformation.education && cvInformation.education.length > 0) {
          // Delete existing education records
          await tx.run(
            cds.ql.DELETE.from(EducationDetail).where({ seeker_profile_ID: seekerProfileId })
          );

          // Insert new education records
          const educationEntries = cvInformation.education.map(edu => ({
            seeker_profile_ID: seekerProfileId,
            certificate_degree_name: edu.degree || '',
            major: edu.major || '',
            institute_university_name: edu.institution || '',
            starting_date: edu.startDate ? parseMonthYearToDate(edu.startDate) : null,
            completion_date: edu.endDate ? parseMonthYearToDate(edu.endDate) : null,
            cgpa: edu.gpa ? parseFloat(edu.gpa) : null
          }));

          await tx.run(cds.ql.INSERT.into(EducationDetail).entries(educationEntries));
        }

        if (cvInformation.experience && cvInformation.experience.length > 0) {
          await tx.run(
            cds.ql.DELETE.from(ExperienceDetail).where({ seeker_profile_ID: seekerProfileId })
          );

          // Insert new experience records
          const experienceEntries = cvInformation.experience.map((exp, index) => ({
            seeker_profile_ID: seekerProfileId,
            sequence_number: index + 1,
            is_current_job: exp.current || false,
            start_date: exp.startDate ? parseMonthYearToDate(exp.startDate) : null,
            end_date: exp.endDate && !exp.current ? parseMonthYearToDate(exp.endDate) : null,
            job_title: exp.title || '',
            company_name: exp.company || '',
            job_location_city: exp.location || '',
            description: exp.description || ''
          }));

          await tx.run(cds.ql.INSERT.into(ExperienceDetail).entries(experienceEntries));
        }

        // 5. Handle Skills
        if (cvInformation.skills) {
          // Delete existing skill associations
          await tx.run(
            cds.ql.DELETE.from(SeekerSkillSet).where({ seeker_profile_ID: seekerProfileId })
          );

          // Combine all skill categories
          const allSkills = [];
          ['programming', 'technical', 'frameworks', 'tools', 'soft'].forEach(category => {
            if (cvInformation.skills[category] && Array.isArray(cvInformation.skills[category])) {
              cvInformation.skills[category].forEach(skill => {
                allSkills.push({
                  name: skill.name,
                  level: skill.level || 3,
                  category: category
                });
              });
            }
          });

          // Insert skills
          for (const skill of allSkills) {
            // Check if skill exists
            let existingSkill = await tx.run(
              cds.ql.SELECT.from(SkillSet).where({ skill_set_name: skill.name })
            );

            let skillSetId;
            if (existingSkill.length > 0) {
              skillSetId = existingSkill[0].ID;
            } else {
              // Create new skill
              const newSkill = await tx.run(
                cds.ql.INSERT.into(SkillSet).entries({
                  skill_set_name: skill.name,
                  category: skill.category
                })
              );
              skillSetId = newSkill.lastInsertRowid || newSkill.insertId;
            }

            // Create seeker skill association
            await tx.run(
              cds.ql.INSERT.into(SeekerSkillSet).entries({
                seeker_profile_ID: seekerProfileId,
                skill_set_ID: skillSetId,
                skill_level: skill.level
              })
            );
          }
        }
      });

      // Return success response
      res.status(200).json({
        success: true,
        message: 'Application saved successfully',
        candidateId: candidateId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error saving application:', error);
      
      res.status(500).json({
        error: {
          message: 'Failed to save application',
          details: error.message
        }
      });
    }
  });


  function parseMonthYearToDate(dateString) {
    if (!dateString || typeof dateString !== 'string') return null;
    
    try {
      if (dateString.includes('-')) {
        const [month, year] = dateString.split('-');
        return new Date(parseInt(year), parseInt(month) - 1, 1);
      }
      return new Date(dateString);
    } catch (error) {
      console.error('Error parsing date:', dateString, error);
      return null;
    }
  }


});

// Start the server
cds.serve('all').at('odata').then(() => {
  console.info(`Server is running at http://localhost:${process.env.PORT || 4004}`);
}).catch(console.error);