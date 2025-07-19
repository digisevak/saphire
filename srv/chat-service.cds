using {saphire.hire as chat} from '../db/model';
using ChatService.types as types from './types';

service ChatService {

    function getModels()                                                                returns array of types.Model;
    function getCompletion(model : String, personality : String, chat : String)         returns types.Completion;
    function getCompletionAsStream(model : String, personality : String, chat : String) returns Binary;
    
    // Chat-related entities
    entity Chats         as projection on chat.Chats;
    entity Messages      as projection on chat.Messages;
    entity Personalities as projection on chat.Personalities;
    entity AIAgents      as projection on chat.AIAgents;
    
    // User and Profile entities
    entity UserType      as projection on chat.UserType;
    entity UserAccount   as projection on chat.UserAccount;
    entity UserLog       as projection on chat.UserLog;
    
    @cds.redirection.target
    entity SeekerProfile as projection on chat.SeekerProfile;
    
    // Education and Experience entities
    entity EducationDetail  as projection on chat.EducationDetail;
    entity ExperienceDetail as projection on chat.ExperienceDetail;
    
    // Skills entities
    entity SkillSet        as projection on chat.SkillSet;
    entity SeekerSkillSet  as projection on chat.SeekerSkillSet;
    entity SkillTaxonomy   as projection on chat.SkillTaxonomy;
    
    // Company and Job entities
    entity Company         as projection on chat.Company;
    entity CompanyImage    as projection on chat.CompanyImage;
    entity JobType         as projection on chat.JobType;
    entity JobLocation     as projection on chat.JobLocation;
    
    @cds.redirection.target
    entity JobPost         as projection on chat.JobPost;
    entity JobPostSkillSet as projection on chat.JobPostSkillSet;
    entity JobPostActivity as projection on chat.JobPostActivity;
    
    // AI and Screening entities
    @cds.redirection.target
    entity AIScreeningResult as projection on chat.AIScreeningResult;
    entity AISkillMatch      as projection on chat.AISkillMatch;
    entity AIModel           as projection on chat.AIModel;
    
    // Interview and Hiring entities
    entity InterviewSchedule as projection on chat.InterviewSchedule;
    entity HiringDecision    as projection on chat.HiringDecision;
    
    // Notification and Communication entities
    entity Notification   as projection on chat.Notification;
    entity EmailTemplate  as projection on chat.EmailTemplate;
    
    // Metrics and Analytics entities
    entity HiringMetrics     as projection on chat.HiringMetrics;
    entity DiversityMetrics  as projection on chat.DiversityMetrics;
    
    // Views for candidate matching and job summaries (read-only views)
    entity CandidateMatchView   as projection on chat.CandidateMatchView;
    entity JobPostSummaryView   as projection on chat.JobPostSummaryView;
    entity TopCandidatesView    as projection on chat.TopCandidatesView;

    // annotate Chats with @(restrict: [
    //     {
    //         grant: 'WRITE',
    //         to   : 'human'
    //     },
    //     {
    //         grant: [
    //             'READ',
    //             'UPDATE',
    //             'DELETE'
    //         ],
    //         to   : 'human',
    //         where: 'createdBy = $user'
    //     }
    // ]);

// This only works on SAP HANA
// @see: https://cap.cloud.sap/docs/guides/authorization#association-paths
// annotate Messages with @(restrict: [{
//     grant: [
//         'WRITE',
//         'READ',
//         'UPDATE',
//         'DELETE'
//     ],
//     to   : 'human',
//     where: 'chat.createdBy = $user'
// }]);

}