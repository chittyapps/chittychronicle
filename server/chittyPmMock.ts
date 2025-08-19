import type { Express } from "express";
import { storage } from "./storage";
import { randomUUID } from 'crypto';

const uuidv4 = randomUUID;

// Mock ChittyPM API responses
interface ChittyPmProject {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'archived' | 'completed';
  createdAt: string;
  updatedAt: string;
  members: ChittyPmMember[];
  tasks: ChittyPmTask[];
}

interface ChittyPmMember {
  chittyId: string;
  name: string;
  role: string;
  email: string;
}

interface ChittyPmTask {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
  assignee: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

interface ChittyForgeDocument {
  id: string;
  name: string;
  path: string;
  type: string;
  size: number;
  createdAt: string;
  lastModified: string;
  owner: string;
  permissions: string[];
}

interface ChittyCanConversation {
  id: string;
  participants: string[];
  messages: ChittyCanMessage[];
  topic: string;
  createdAt: string;
}

interface ChittyCanMessage {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  attachments: string[];
}

// Mock data generator
class ChittyMockDataGenerator {
  
  generateProject(caseId: string): ChittyPmProject {
    return {
      id: `pm-${uuidv4().substring(0, 8)}`,
      name: `Legal Case ${caseId.substring(0, 8)}`,
      description: "Legal case management project synced from ChittyChronicle",
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      members: [
        {
          chittyId: 'CID-001',
          name: 'John Attorney',
          role: 'Lead Counsel',
          email: 'john@lawfirm.com'
        },
        {
          chittyId: 'CID-002',
          name: 'Jane Paralegal',
          role: 'Paralegal',
          email: 'jane@lawfirm.com'
        }
      ],
      tasks: [
        {
          id: `task-${uuidv4().substring(0, 8)}`,
          title: 'Review discovery documents',
          description: 'Review and categorize all discovery documents',
          status: 'in_progress',
          assignee: 'CID-002',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          priority: 'high'
        },
        {
          id: `task-${uuidv4().substring(0, 8)}`,
          title: 'Prepare motion to compel',
          description: 'Draft motion to compel discovery responses',
          status: 'todo',
          assignee: 'CID-001',
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          priority: 'medium'
        }
      ]
    };
  }
  
  generateDocuments(caseId: string): ChittyForgeDocument[] {
    return [
      {
        id: `doc-${uuidv4().substring(0, 8)}`,
        name: 'Initial_Complaint.pdf',
        path: `/cases/${caseId}/pleadings/`,
        type: 'application/pdf',
        size: 2456789,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        lastModified: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
        owner: 'CID-001',
        permissions: ['read', 'write', 'share']
      },
      {
        id: `doc-${uuidv4().substring(0, 8)}`,
        name: 'Answer_to_Complaint.pdf',
        path: `/cases/${caseId}/pleadings/`,
        type: 'application/pdf',
        size: 1234567,
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        lastModified: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
        owner: 'CID-002',
        permissions: ['read', 'write']
      },
      {
        id: `doc-${uuidv4().substring(0, 8)}`,
        name: 'Discovery_Requests.docx',
        path: `/cases/${caseId}/discovery/`,
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 567890,
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        lastModified: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        owner: 'CID-001',
        permissions: ['read', 'write', 'share', 'delete']
      }
    ];
  }
  
  generateConversation(caseId: string): ChittyCanConversation {
    return {
      id: `conv-${uuidv4().substring(0, 8)}`,
      participants: ['CID-001', 'CID-002', 'CID-003'],
      topic: `Case Discussion: ${caseId.substring(0, 8)}`,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      messages: [
        {
          id: `msg-${uuidv4().substring(0, 8)}`,
          sender: 'CID-001',
          content: 'We need to review the new discovery documents ASAP.',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          attachments: []
        },
        {
          id: `msg-${uuidv4().substring(0, 8)}`,
          sender: 'CID-002',
          content: 'I\'ve started the review. Found some interesting contradictions in the witness statements.',
          timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          attachments: ['witness_analysis.pdf']
        },
        {
          id: `msg-${uuidv4().substring(0, 8)}`,
          sender: 'CID-001',
          content: 'Great work! Let\'s discuss this in tomorrow\'s meeting.',
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          attachments: []
        }
      ]
    };
  }
}

const mockGenerator = new ChittyMockDataGenerator();

// Register mock ChittyPM API endpoints
export function registerChittyPmMockEndpoints(app: Express) {
  
  // ChittyPM Project Management endpoints
  app.get('/api/chittypm/projects/:caseId', async (req, res) => {
    try {
      const { caseId } = req.params;
      const project = mockGenerator.generateProject(caseId);
      
      // Store in database for consistency
      await storage.createChittyPmProject({
        chittyPmId: project.id,
        projectName: project.name,
        description: project.description,
        metadata: project,
        createdAt: new Date()
      });
      
      res.json({
        success: true,
        data: project,
        message: 'Mock ChittyPM project data'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `Failed to fetch ChittyPM project: ${error}`
      });
    }
  });
  
  app.post('/api/chittypm/projects', async (req, res) => {
    try {
      const { caseId, name, description } = req.body;
      const project = mockGenerator.generateProject(caseId);
      project.name = name || project.name;
      project.description = description || project.description;
      
      res.status(201).json({
        success: true,
        data: project,
        message: 'Mock ChittyPM project created'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `Failed to create ChittyPM project: ${error}`
      });
    }
  });
  
  app.post('/api/chittypm/tasks', async (req, res) => {
    try {
      const { projectId, title, description, assignee, dueDate, priority } = req.body;
      
      const task: ChittyPmTask = {
        id: `task-${uuidv4().substring(0, 8)}`,
        title,
        description,
        status: 'todo',
        assignee,
        dueDate,
        priority: priority || 'medium'
      };
      
      res.status(201).json({
        success: true,
        data: task,
        message: 'Mock ChittyPM task created'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `Failed to create ChittyPM task: ${error}`
      });
    }
  });
  
  app.put('/api/chittypm/tasks/:taskId', async (req, res) => {
    try {
      const { taskId } = req.params;
      const updates = req.body;
      
      res.json({
        success: true,
        data: {
          id: taskId,
          ...updates,
          updatedAt: new Date().toISOString()
        },
        message: 'Mock ChittyPM task updated'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `Failed to update ChittyPM task: ${error}`
      });
    }
  });
  
  // ChittyForge Document Management endpoints
  app.get('/api/chittyforge/documents/:caseId', async (req, res) => {
    try {
      const { caseId } = req.params;
      const documents = mockGenerator.generateDocuments(caseId);
      
      res.json({
        success: true,
        data: documents,
        message: 'Mock ChittyForge documents'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `Failed to fetch ChittyForge documents: ${error}`
      });
    }
  });
  
  app.post('/api/chittyforge/upload', async (req, res) => {
    try {
      const { fileName, caseId, fileType, fileSize } = req.body;
      
      const document: ChittyForgeDocument = {
        id: `doc-${uuidv4().substring(0, 8)}`,
        name: fileName,
        path: `/cases/${caseId}/uploads/`,
        type: fileType || 'application/octet-stream',
        size: fileSize || 0,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        owner: 'CID-CURRENT',
        permissions: ['read', 'write', 'share', 'delete']
      };
      
      res.status(201).json({
        success: true,
        data: document,
        message: 'Mock ChittyForge document uploaded'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `Failed to upload to ChittyForge: ${error}`
      });
    }
  });
  
  app.get('/api/chittyforge/document/:documentId', async (req, res) => {
    try {
      const { documentId } = req.params;
      
      res.json({
        success: true,
        data: {
          id: documentId,
          content: 'Mock document content for preview',
          metadata: {
            pages: 10,
            wordCount: 5000,
            extractedText: 'This is sample extracted text from the document...'
          }
        },
        message: 'Mock ChittyForge document content'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `Failed to fetch ChittyForge document: ${error}`
      });
    }
  });
  
  // ChittyCan Communication endpoints
  app.get('/api/chittycan/conversations/:caseId', async (req, res) => {
    try {
      const { caseId } = req.params;
      const conversation = mockGenerator.generateConversation(caseId);
      
      res.json({
        success: true,
        data: [conversation],
        message: 'Mock ChittyCan conversations'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `Failed to fetch ChittyCan conversations: ${error}`
      });
    }
  });
  
  app.post('/api/chittycan/message', async (req, res) => {
    try {
      const { conversationId, content, attachments } = req.body;
      
      const message: ChittyCanMessage = {
        id: `msg-${uuidv4().substring(0, 8)}`,
        sender: 'CID-CURRENT',
        content,
        timestamp: new Date().toISOString(),
        attachments: attachments || []
      };
      
      res.status(201).json({
        success: true,
        data: message,
        message: 'Mock ChittyCan message sent'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `Failed to send ChittyCan message: ${error}`
      });
    }
  });
  
  app.post('/api/chittycan/conversation', async (req, res) => {
    try {
      const { participants, topic, initialMessage } = req.body;
      
      const conversation: ChittyCanConversation = {
        id: `conv-${uuidv4().substring(0, 8)}`,
        participants: participants || [],
        topic: topic || 'New Conversation',
        createdAt: new Date().toISOString(),
        messages: initialMessage ? [{
          id: `msg-${uuidv4().substring(0, 8)}`,
          sender: 'CID-CURRENT',
          content: initialMessage,
          timestamp: new Date().toISOString(),
          attachments: []
        }] : []
      };
      
      res.status(201).json({
        success: true,
        data: conversation,
        message: 'Mock ChittyCan conversation created'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `Failed to create ChittyCan conversation: ${error}`
      });
    }
  });
  
  // ChittyID Authentication endpoints
  app.post('/api/chittyid/authenticate', async (req, res) => {
    try {
      const { chittyId, password } = req.body;
      
      // Mock authentication
      if (chittyId && password) {
        res.json({
          success: true,
          data: {
            chittyId,
            name: 'Mock User',
            email: 'user@chitty.com',
            roles: ['attorney', 'admin'],
            token: `mock-token-${uuidv4()}`,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          },
          message: 'Mock ChittyID authentication successful'
        });
      } else {
        res.status(401).json({
          success: false,
          error: 'Invalid ChittyID credentials'
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `ChittyID authentication failed: ${error}`
      });
    }
  });
  
  app.get('/api/chittyid/user/:chittyId', async (req, res) => {
    try {
      const { chittyId } = req.params;
      
      res.json({
        success: true,
        data: {
          chittyId,
          name: `User ${chittyId}`,
          email: `${chittyId.toLowerCase()}@chitty.com`,
          roles: ['attorney'],
          department: 'Legal',
          createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()
        },
        message: 'Mock ChittyID user data'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `Failed to fetch ChittyID user: ${error}`
      });
    }
  });
  
  // Integration sync endpoint
  app.post('/api/chitty/sync/:caseId', async (req, res) => {
    try {
      const { caseId } = req.params;
      const { services } = req.body; // ['chittypm', 'chittyforge', 'chittycan']
      
      const syncResults: any = {};
      
      if (services?.includes('chittypm')) {
        const project = mockGenerator.generateProject(caseId);
        syncResults.chittypm = {
          synced: true,
          projectId: project.id,
          tasksCreated: project.tasks.length
        };
      }
      
      if (services?.includes('chittyforge')) {
        const documents = mockGenerator.generateDocuments(caseId);
        syncResults.chittyforge = {
          synced: true,
          documentsFound: documents.length
        };
      }
      
      if (services?.includes('chittycan')) {
        const conversation = mockGenerator.generateConversation(caseId);
        syncResults.chittycan = {
          synced: true,
          conversationId: conversation.id,
          messages: conversation.messages.length
        };
      }
      
      res.json({
        success: true,
        data: syncResults,
        message: 'Mock Chitty ecosystem sync completed'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `Sync failed: ${error}`
      });
    }
  });
}

export { ChittyMockDataGenerator };