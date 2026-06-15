import { createContractService } from "../services/contractService.js";

export function createContractController(group, options = {}) {
  const service = createContractService(group, options);
  return {
    index(req, res) {
      res.json(200, service.listContract());
    },
  };
}
