import { createMessageService, createNotificationService } from "../services/messageNotificationService.js";

export function createMessageController(options = {}) {
  const service = createMessageService(options);
  return {
    async index(req, res) {
      const threads = await service.listThreads(req);
      res.json(200, { resource: "messages", count: threads.length, data: threads });
    },
    async show(req, res) {
      const detail = await service.getThreadDetail(req.params.threadId, req);
      res.json(200, { resource: "messages", thread: detail.thread, messages: detail.messages });
    },
    async create(req, res) {
      if (req.body?.kind === "thread" || req.body?.ensure_thread) {
        const thread = await service.ensureThread(req.body || {}, req);
        res.json(201, { resource: "messages", thread, data: thread });
        return;
      }
      const result = await service.sendMessage(req.body || {}, req);
      res.json(201, { resource: "messages", message: result.message, thread: result.thread, data: result.message });
    },
    async update(req, res) {
      const result = await service.patchMessageOrThread(req.params.messageId, req.body || {}, req);
      res.json(200, { resource: "messages", ...result, data: result.message || result.thread });
    },
  };
}

export function createNotificationController(options = {}) {
  const service = createNotificationService(options);
  return {
    async index(req, res) {
      const notifications = await service.list(req);
      res.json(200, { resource: "notifications", count: notifications.length, data: notifications });
    },
    async show(req, res) {
      const notification = await service.findById(req.params.id, req);
      res.json(200, { resource: "notifications", data: notification });
    },
    async create(req, res) {
      const notification = await service.create(req.body || {}, req);
      res.json(201, { resource: "notifications", data: notification });
    },
    async update(req, res) {
      const notification = await service.update(req.params.id, req.body || {}, req);
      res.json(200, { resource: "notifications", data: notification });
    },
  };
}
