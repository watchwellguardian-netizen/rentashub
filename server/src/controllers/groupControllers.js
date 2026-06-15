import {
  adminService,
  assetsService,
  authService,
  bookingsService,
  claimsService,
  disputesService,
  inspectionsService,
  marketplaceService,
  messagesService,
  notificationsService,
  paymentsService,
  protectionService,
  reviewsService,
  suppliersService,
  trustService,
  usersService,
  verificationsService,
} from "../services/groupServices.js";

function controllerFor(service) {
  return {
    index(req, res) {
      res.json(200, service.listContract());
    },
  };
}

export const authController = controllerFor(authService);
export const usersController = controllerFor(usersService);
export const assetsController = controllerFor(assetsService);
export const bookingsController = controllerFor(bookingsService);
export const inspectionsController = controllerFor(inspectionsService);
export const paymentsController = controllerFor(paymentsService);
export const messagesController = controllerFor(messagesService);
export const notificationsController = controllerFor(notificationsService);
export const suppliersController = controllerFor(suppliersService);
export const verificationsController = controllerFor(verificationsService);
export const reviewsController = controllerFor(reviewsService);
export const disputesController = controllerFor(disputesService);
export const marketplaceController = controllerFor(marketplaceService);
export const trustController = controllerFor(trustService);
export const protectionController = controllerFor(protectionService);
export const claimsController = controllerFor(claimsService);
export const adminController = controllerFor(adminService);
