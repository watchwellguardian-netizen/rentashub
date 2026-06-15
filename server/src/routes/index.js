import { registerContractRoutes } from "./contractRoutes.js";
import { registerHealthRoutes } from "./healthRoutes.js";
import { registerAssetRoutes, registerBookingRoutes, registerInspectionRoutes } from "./resourceRoutes.js";
import { registerAuthRoutes } from "./authRoutes.js";
import { registerFileRoutes } from "./fileRoutes.js";
import { registerMessageRoutes, registerNotificationRoutes } from "./messageNotificationRoutes.js";
import { registerReviewApiRoutes } from "./reviewApiRoutes.js";
import { registerTrustApiRoutes } from "./trustApiRoutes.js";
import { registerProtectionClaimsApiRoutes } from "./protectionClaimsApiRoutes.js";
import { registerDisputeApiRoutes } from "./disputeApiRoutes.js";
import { registerPaymentApiRoutes } from "./paymentApiRoutes.js";
import { registerMonitoringRoutes } from "./monitoringRoutes.js";
import { registerEscrowRoutes } from "./escrowRoutes.js";
import { registerAuditRoutes } from "./auditRoutes.js";

export function registerRoutes(router, options = {}) {
  registerHealthRoutes(router);
  registerAuthRoutes(router, options);
  registerFileRoutes(router, options);
  registerAssetRoutes(router, options);
  registerBookingRoutes(router, options);
  registerInspectionRoutes(router, options);
  registerMessageRoutes(router, options);
  registerNotificationRoutes(router, options);
  registerReviewApiRoutes(router, options);
  registerTrustApiRoutes(router, options);
  registerProtectionClaimsApiRoutes(router, options);
  registerDisputeApiRoutes(router, options);
  registerPaymentApiRoutes(router, options);
  registerMonitoringRoutes(router, options);
  registerEscrowRoutes(router, options);
  registerAuditRoutes(router, options);
  registerContractRoutes(router);
}
