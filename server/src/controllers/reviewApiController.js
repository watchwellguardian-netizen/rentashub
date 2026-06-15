import { createReviewApiService } from "../services/reviewApiService.js";

export function createReviewApiController(options = {}) {
  const service = createReviewApiService(options);
  const map = (review) => service.mapReview(review);
  return {
    async index(req, res) {
      const reviews = await service.list(req.query || {}, req);
      res.json(200, { resource: "reviews", count: reviews.length, data: reviews.map(map) });
    },
    async show(req, res) {
      const review = await service.findById(req.params.id, req);
      res.json(200, { resource: "reviews", data: map(review) });
    },
    async create(req, res) {
      const review = await service.create(req.body || {}, req);
      res.json(201, { resource: "reviews", data: map(review) });
    },
    async update(req, res) {
      const review = await service.update(req.params.id, req.body || {}, req);
      res.json(200, { resource: "reviews", data: map(review) });
    },
  };
}
