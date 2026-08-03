import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./state/AuthContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AppShell from "./components/AppShell.jsx";
import GlobalBrandMark from "./components/GlobalBrandMark.jsx";

const lazyPage = (loader, exportName = "default") =>
  lazy(() => loader().then((module) => ({ default: module[exportName] })));

const Login = lazyPage(() => import("./pages/Login.jsx"));
const LandingPage = lazyPage(() => import("./pages/LandingPage.jsx"));
const CustomerDashboard = lazyPage(() => import("./pages/CustomerDashboard.jsx"));
const SupplierDashboard = lazyPage(() => import("./pages/SupplierDashboard.jsx"));
const ListAsset = lazyPage(() => import("./pages/ListAsset.jsx"));
const MyListings = lazyPage(() => import("./pages/MyListings.jsx"));
const AssetDetail = lazyPage(() => import("./pages/AssetDetail.jsx"));
const EditAsset = lazyPage(() => import("./pages/EditAsset.jsx"));
const BookingRequest = lazyPage(() => import("./pages/BookingRequest.jsx"));
const BookingDetail = lazyPage(() => import("./pages/BookingDetail.jsx"));
const CustomerBookings = lazyPage(() => import("./pages/CustomerBookings.jsx"));
const SupplierRentalRequests = lazyPage(() => import("./pages/SupplierRentalRequests.jsx"));
const InspectionForm = lazyPage(() => import("./pages/InspectionForm.jsx"));
const InspectionDetail = lazyPage(() => import("./pages/InspectionDetail.jsx"));
const BookingPayment = lazyPage(() => import("./pages/BookingPayment.jsx"));
const PaymentsPage = lazyPage(() => import("./pages/PaymentsPage.jsx"));
const WalletPage = lazyPage(() => import("./pages/WalletPage.jsx"));
const EarningsPage = lazyPage(() => import("./pages/EarningsPage.jsx"));
const PayoutsPage = lazyPage(() => import("./pages/PayoutsPage.jsx"));
const TransactionDetail = lazyPage(() => import("./pages/TransactionDetail.jsx"));
const MessagesPage = lazyPage(() => import("./pages/MessagesPage.jsx"));
const NotificationsPage = lazyPage(() => import("./pages/NotificationsPage.jsx"));
const SupportPage = lazyPage(() => import("./pages/SupportPage.jsx"));
const AdminSupportPage = lazyPage(() => import("./pages/SupportPage.jsx"), "AdminSupportPage");
const SupplierProfile = lazyPage(() => import("./pages/SupplierProfile.jsx"));
const SupplierProfileEdit = lazyPage(() => import("./pages/SupplierProfileEdit.jsx"));
const VerificationPage = lazyPage(() => import("./pages/VerificationPage.jsx"));
const VerificationStatus = lazyPage(() => import("./pages/VerificationStatus.jsx"));
const AdminBookings = lazyPage(() => import("./pages/AdminCenter.jsx"), "AdminBookings");
const AdminCompliance = lazyPage(() => import("./pages/AdminCenter.jsx"), "AdminCompliance");
const AdminDashboard = lazyPage(() => import("./pages/AdminCenter.jsx"), "AdminDashboard");
const AdminListings = lazyPage(() => import("./pages/AdminCenter.jsx"), "AdminListings");
const AdminMessages = lazyPage(() => import("./pages/AdminCenter.jsx"), "AdminMessages");
const AdminPayments = lazyPage(() => import("./pages/AdminCenter.jsx"), "AdminPayments");
const AdminReports = lazyPage(() => import("./pages/AdminCenter.jsx"), "AdminReports");
const AdminRevenue = lazyPage(() => import("./pages/AdminCenter.jsx"), "AdminRevenue");
const AdminReviews = lazyPage(() => import("./pages/AdminCenter.jsx"), "AdminReviews");
const AdminSettings = lazyPage(() => import("./pages/AdminCenter.jsx"), "AdminSettings");
const AdminUsers = lazyPage(() => import("./pages/AdminCenter.jsx"), "AdminUsers");
const AdminVerifications = lazyPage(() => import("./pages/AdminCenter.jsx"), "AdminVerifications");
const ReviewForm = lazyPage(() => import("./pages/ReviewForm.jsx"));
const AssetReviewsPage = lazyPage(() => import("./pages/ReviewsPage.jsx"), "AssetReviewsPage");
const ReviewsPage = lazyPage(() => import("./pages/ReviewsPage.jsx"), "ReviewsPage");
const SupplierReviewsPage = lazyPage(() => import("./pages/ReviewsPage.jsx"), "SupplierReviewsPage");
const MarketplaceSearch = lazyPage(() => import("./pages/MarketplaceSearch.jsx"));
const CategoryPage = lazyPage(() => import("./pages/CategoryPage.jsx"));
const CategoryProductPage = lazyPage(() => import("./pages/CategoryProductPage.jsx"));
const ModulePlaceholder = lazyPage(() => import("./pages/ModulePlaceholder.jsx"));
const MarketplaceLanding = lazyPage(() => import("./pages/ExchangeMarketplace.jsx"), "MarketplaceLanding");
const TradeRequestPage = lazyPage(() => import("./pages/ExchangeMarketplace.jsx"), "TradeRequestPage");
const WantedPage = lazyPage(() => import("./pages/ExchangeMarketplace.jsx"), "WantedPage");
const MarketplaceOffer = lazyPage(() => import("./pages/MarketplaceOffer.jsx"));
const BrokerageLeads = lazyPage(() => import("./pages/BrokerageLeads.jsx"));
const AdminRiskPage = lazyPage(() => import("./pages/TrustCenter.jsx"), "AdminRiskPage");
const AssetTrustPage = lazyPage(() => import("./pages/TrustCenter.jsx"), "AssetTrustPage");
const CustomerTrustPage = lazyPage(() => import("./pages/TrustCenter.jsx"), "CustomerTrustPage");
const SupplierTrustPage = lazyPage(() => import("./pages/TrustCenter.jsx"), "SupplierTrustPage");
const TrustOverview = lazyPage(() => import("./pages/TrustCenter.jsx"), "TrustOverview");
const AdminAiListingRecommendationsPage = lazyPage(() => import("./pages/AiAssistant.jsx"), "AdminAiListingRecommendationsPage");
const AdminAiValuationAuditPage = lazyPage(() => import("./pages/AiAssistant.jsx"), "AdminAiValuationAuditPage");
const AiBrokerAssistantPage = lazyPage(() => import("./pages/AiAssistant.jsx"), "AiBrokerAssistantPage");
const AiHome = lazyPage(() => import("./pages/AiAssistant.jsx"), "AiHome");
const AiListingAssistantPage = lazyPage(() => import("./pages/AiAssistant.jsx"), "AiListingAssistantPage");
const AiMarketInsightsPage = lazyPage(() => import("./pages/AiAssistant.jsx"), "AiMarketInsightsPage");
const AiRentalAdvisorPage = lazyPage(() => import("./pages/AiAssistant.jsx"), "AiRentalAdvisorPage");
const AiSearchPage = lazyPage(() => import("./pages/AiAssistant.jsx"), "AiSearchPage");
const AiValuationEnginePage = lazyPage(() => import("./pages/AiAssistant.jsx"), "AiValuationEnginePage");
const AdminClaimsPage = lazyPage(() => import("./pages/ProtectionPages.jsx"), "AdminClaimsPage");
const AssetProtectionPage = lazyPage(() => import("./pages/ProtectionPages.jsx"), "AssetProtectionPage");
const BookingProtectionPage = lazyPage(() => import("./pages/ProtectionPages.jsx"), "BookingProtectionPage");
const ClaimDetailPage = lazyPage(() => import("./pages/ProtectionPages.jsx"), "ClaimDetailPage");
const ClaimsPage = lazyPage(() => import("./pages/ProtectionPages.jsx"), "ClaimsPage");
const NewClaimPage = lazyPage(() => import("./pages/ProtectionPages.jsx"), "NewClaimPage");
const ProtectionOverview = lazyPage(() => import("./pages/ProtectionPages.jsx"), "ProtectionOverview");
const ProtectionPlansPage = lazyPage(() => import("./pages/ProtectionPages.jsx"), "ProtectionPlansPage");
const AdminDisputesPage = lazyPage(() => import("./pages/DisputePages.jsx"), "AdminDisputesPage");
const DisputeDetailPage = lazyPage(() => import("./pages/DisputePages.jsx"), "DisputeDetailPage");
const DisputesPage = lazyPage(() => import("./pages/DisputePages.jsx"), "DisputesPage");
const NewDisputePage = lazyPage(() => import("./pages/DisputePages.jsx"), "NewDisputePage");
const AdminAuctionPage = lazyPage(() => import("./pages/AuctionPages.jsx"), "AdminAuctionPage");
const AuctionBidPage = lazyPage(() => import("./pages/AuctionPages.jsx"), "AuctionBidPage");
const AuctionCategoryPage = lazyPage(() => import("./pages/AuctionPages.jsx"), "AuctionCategoryPage");
const AuctionDetail = lazyPage(() => import("./pages/AuctionPages.jsx"), "AuctionDetail");
const AuctionDisputePage = lazyPage(() => import("./pages/AuctionPages.jsx"), "AuctionDisputePage");
const AuctionDocumentLibraryPage = lazyPage(() => import("./pages/AuctionPages.jsx"), "AuctionDocumentLibraryPage");
const AuctionEscrowLedgerPage = lazyPage(() => import("./pages/AuctionPages.jsx"), "AuctionEscrowLedgerPage");
const AuctionNotificationAuditPage = lazyPage(() => import("./pages/AuctionPages.jsx"), "AuctionNotificationAuditPage");
const AuctionParishPage = lazyPage(() => import("./pages/AuctionPages.jsx"), "AuctionParishPage");
const AuctionStaticPage = lazyPage(() => import("./pages/AuctionPages.jsx"), "AuctionStaticPage");
const AuctionSupportPage = lazyPage(() => import("./pages/AuctionPages.jsx"), "AuctionSupportPage");
const AuctionsLanding = lazyPage(() => import("./pages/AuctionPages.jsx"), "AuctionsLanding");
const BuyerAuctionPage = lazyPage(() => import("./pages/AuctionPages.jsx"), "BuyerAuctionPage");
const DealerAuctionPage = lazyPage(() => import("./pages/AuctionPages.jsx"), "DealerAuctionPage");
const SupplierAuctionPage = lazyPage(() => import("./pages/AuctionPages.jsx"), "SupplierAuctionPage");
const AdminInspectorsPage = lazyPage(() => import("./pages/InspectionMarketplacePages.jsx"), "AdminInspectorsPage");
const AuctionInspectionRequestPage = lazyPage(() => import("./pages/InspectionMarketplacePages.jsx"), "AuctionInspectionRequestPage");
const InspectorRegistrationPage = lazyPage(() => import("./pages/InspectionMarketplacePages.jsx"), "InspectorRegistrationPage");
const InspectorsDashboardPage = lazyPage(() => import("./pages/InspectionMarketplacePages.jsx"), "InspectorsDashboardPage");
const InspectorsDirectoryPage = lazyPage(() => import("./pages/InspectionMarketplacePages.jsx"), "InspectorsDirectoryPage");
const AdminTransportProvidersPage = lazyPage(() => import("./pages/TransportMarketplacePages.jsx"), "AdminTransportProvidersPage");
const AuctionTransportRequestPage = lazyPage(() => import("./pages/TransportMarketplacePages.jsx"), "AuctionTransportRequestPage");
const TransportDashboardPage = lazyPage(() => import("./pages/TransportMarketplacePages.jsx"), "TransportDashboardPage");
const TransportDirectoryPage = lazyPage(() => import("./pages/TransportMarketplacePages.jsx"), "TransportDirectoryPage");
const TransportRegistrationPage = lazyPage(() => import("./pages/TransportMarketplacePages.jsx"), "TransportRegistrationPage");
const AdminFinancingPartnersPage = lazyPage(() => import("./pages/FinancingMarketplacePages.jsx"), "AdminFinancingPartnersPage");
const AuctionFinancingRequestPage = lazyPage(() => import("./pages/FinancingMarketplacePages.jsx"), "AuctionFinancingRequestPage");
const FinancingDashboardPage = lazyPage(() => import("./pages/FinancingMarketplacePages.jsx"), "FinancingDashboardPage");
const FinancingDirectoryPage = lazyPage(() => import("./pages/FinancingMarketplacePages.jsx"), "FinancingDirectoryPage");
const FinancingProductsPage = lazyPage(() => import("./pages/FinancingMarketplacePages.jsx"), "FinancingProductsPage");
const FinancingRegistrationPage = lazyPage(() => import("./pages/FinancingMarketplacePages.jsx"), "FinancingRegistrationPage");
const AdminAuctionAnalyticsPage = lazyPage(() => import("./pages/AuctionAnalyticsPages.jsx"), "AdminAuctionAnalyticsPage");
const DealerAuctionAnalyticsPage = lazyPage(() => import("./pages/AuctionAnalyticsPages.jsx"), "DealerAuctionAnalyticsPage");
const SupplierAuctionAnalyticsPage = lazyPage(() => import("./pages/AuctionAnalyticsPages.jsx"), "SupplierAuctionAnalyticsPage");
const AdminAuctionDocumentsPage = lazyPage(() => import("./pages/AuctionDocumentEnginePages.jsx"), "AdminAuctionDocumentsPage");
const AuctionDocumentEnginePage = lazyPage(() => import("./pages/AuctionDocumentEnginePages.jsx"), "AuctionDocumentEnginePage");
const BuyerAuctionDocumentsPage = lazyPage(() => import("./pages/AuctionDocumentEnginePages.jsx"), "BuyerAuctionDocumentsPage");
const SupplierAuctionDocumentsPage = lazyPage(() => import("./pages/AuctionDocumentEnginePages.jsx"), "SupplierAuctionDocumentsPage");
const AdminSystemStatusPage = lazyPage(() => import("./pages/AiStudioConsolidationPages.jsx"), "AdminSystemStatusPage");
const DocumentationPage = lazyPage(() => import("./pages/AiStudioConsolidationPages.jsx"), "DocumentationPage");
const RoleAwareAiAssistantPage = lazyPage(() => import("./pages/AiStudioConsolidationPages.jsx"), "RoleAwareAiAssistantPage");
const WorkflowGuidesPage = lazyPage(() => import("./pages/AiStudioConsolidationPages.jsx"), "WorkflowGuidesPage");

function RouteFallback() {
  return <div className="page-shell">Loading RentasHub...</div>;
}

function DashboardRedirect() {
  const { user } = useAuth();
  if (["customer", "guest", "user"].includes(user?.role)) return <Navigate to="/customer-dashboard" replace />;
  if (["supplier", "vendor"].includes(user?.role)) return <Navigate to="/supplier-dashboard" replace />;
  if (user?.role === "broker") return <Navigate to="/brokerage/leads" replace />;
  if (user?.role === "admin") return <Navigate to="/admin" replace />;
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <>
      <GlobalBrandMark />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/login" element={<Login />} />
        <Route path="/" element={<LandingPage />} />
        <Route path="/search" element={<MarketplaceSearch />} />
        <Route path="/assets" element={<MarketplaceSearch />} />
        <Route path="/marketplace" element={<MarketplaceLanding />} />
        <Route path="/marketplace/:categorySlug" element={<CategoryProductPage />} />
        <Route path="/auctions" element={<AuctionsLanding />} />
        <Route path="/auctions/live" element={<AuctionsLanding mode="live" />} />
        <Route path="/auctions/upcoming" element={<AuctionsLanding mode="upcoming" />} />
        <Route path="/auctions/ending-soon" element={<AuctionsLanding mode="ending-soon" />} />
        <Route path="/auctions/category/:category" element={<AuctionCategoryPage />} />
        <Route path="/auctions/parish/:parish" element={<AuctionParishPage />} />
        <Route path="/auction/:auctionId" element={<AuctionDetail />} />
        <Route path="/auction/:auctionId/bid" element={<AuctionBidPage />} />
        <Route path="/auction/:auctionId/inspection" element={<AuctionInspectionRequestPage />} />
        <Route path="/auction/:auctionId/transport" element={<AuctionTransportRequestPage />} />
        <Route path="/auction/:auctionId/financing" element={<AuctionFinancingRequestPage />} />
        <Route path="/inspectors" element={<InspectorsDirectoryPage />} />
        <Route path="/transport" element={<TransportDirectoryPage />} />
        <Route path="/financing" element={<FinancingDirectoryPage />} />
        <Route path="/financing/products" element={<FinancingProductsPage />} />
        <Route path="/auction-calendar" element={<AuctionStaticPage page="calendar" />} />
        <Route path="/auction-rules" element={<AuctionStaticPage page="rules" />} />
        <Route path="/auction-legal-disclosures" element={<AuctionStaticPage page="legal" />} />
        <Route path="/how-auctions-work" element={<AuctionStaticPage page="how" />} />
        <Route path="/buy" element={<MarketplaceLanding listingType="buy" />} />
        <Route path="/sell" element={<MarketplaceLanding listingType="sell" />} />
        <Route path="/trade" element={<MarketplaceLanding listingType="trade" />} />
        <Route path="/swap" element={<MarketplaceLanding listingType="swap" />} />
        <Route path="/brokerage" element={<MarketplaceLanding listingType="brokerage" />} />
        <Route path="/wanted" element={<WantedPage />} />
        <Route path="/ai" element={<AiHome />} />
        <Route path="/ai/search" element={<AiSearchPage />} />
        <Route path="/ai/listing-assistant" element={<AiListingAssistantPage />} />
        <Route path="/ai/valuation" element={<AiValuationEnginePage />} />
        <Route path="/ai/rental-advisor" element={<AiRentalAdvisorPage />} />
        <Route path="/ai/broker-assistant" element={<AiBrokerAssistantPage />} />
        <Route path="/ai/market-insights" element={<AiMarketInsightsPage />} />
        <Route path="/documentation" element={<DocumentationPage />} />
        <Route path="/workflows" element={<WorkflowGuidesPage />} />
        <Route path="/trust" element={<TrustOverview />} />
        <Route path="/trust/supplier/:supplierId" element={<SupplierTrustPage />} />
        <Route path="/trust/asset/:assetId" element={<AssetTrustPage />} />
        <Route path="/protection" element={<ProtectionOverview />} />
        <Route path="/protection/plans" element={<ProtectionPlansPage />} />
        <Route path="/protection/asset/:assetId" element={<AssetProtectionPage />} />
        <Route path="/category/:categorySlug" element={<CategoryPage />} />
        <Route path="/asset/:id" element={<AssetDetail />} />
        <Route path="/assets/:id" element={<AssetDetail />} />
        <Route path="/asset/:id/reviews" element={<AssetReviewsPage />} />
        <Route path="/supplier/:supplierId/reviews" element={<SupplierReviewsPage />} />
        <Route element={<ProtectedRoute allowedRoles={["customer", "supplier", "broker", "admin"]} />}>
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<DashboardRedirect />} />
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/messages/:threadId" element={<MessagesPage />} />
            <Route path="/booking/:id/messages" element={<MessagesPage bookingMode />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/support" element={<SupportPage />} />
            <Route path="/reviews" element={<ReviewsPage />} />
            <Route path="/ai-help" element={<AiHome />} />
            <Route path="/ai-assistant" element={<RoleAwareAiAssistantPage />} />
            <Route path="/inspectors/register" element={<InspectorRegistrationPage />} />
            <Route path="/inspectors/bookings" element={<InspectorsDashboardPage view="bookings" />} />
            <Route path="/inspectors/reports" element={<InspectorsDashboardPage view="reports" />} />
            <Route path="/transport/register" element={<TransportRegistrationPage />} />
            <Route path="/transport/bookings" element={<TransportDashboardPage view="bookings" />} />
            <Route path="/transport/quotes" element={<TransportDashboardPage view="quotes" />} />
            <Route path="/financing/register" element={<FinancingRegistrationPage />} />
            <Route path="/financing/referrals" element={<FinancingDashboardPage view="referrals" />} />
          </Route>
        </Route>
        <Route element={<ProtectedRoute allowedRoles={["customer"]} />}>
          <Route element={<AppShell />}>
            <Route path="/customer-dashboard" element={<CustomerDashboard />} />
            <Route path="/dashboard/auctions" element={<BuyerAuctionPage />} />
            <Route path="/dashboard/auction-watchlist" element={<BuyerAuctionPage view="watchlist" />} />
            <Route path="/dashboard/my-bids" element={<BuyerAuctionPage view="bids" />} />
            <Route path="/dashboard/won-auctions" element={<BuyerAuctionPage view="won" />} />
            <Route path="/dashboard/auction-payments" element={<BuyerAuctionPage view="payments" />} />
            <Route path="/dashboard/auction-escrow" element={<BuyerAuctionPage view="escrow" />} />
            <Route path="/dashboard/title-transfer" element={<BuyerAuctionPage view="title" />} />
            <Route path="/dashboard/auction-disputes" element={<BuyerAuctionPage view="disputes" />} />
            <Route path="/dashboard/auction-documents" element={<BuyerAuctionDocumentsPage />} />
            <Route path="/bookings" element={<CustomerBookings />} />
            <Route path="/payments" element={<PaymentsPage />} />
            <Route path="/wallet" element={<WalletPage />} />
            <Route path="/asset/:id/book" element={<BookingRequest />} />
            <Route path="/assets/:id/book" element={<BookingRequest />} />
            <Route path="/booking/:id/payment" element={<BookingPayment />} />
            <Route path="/booking/:id/check-in" element={<InspectionForm type="check-in" />} />
            <Route path="/booking/:id/check-out" element={<InspectionForm type="check-out" />} />
            <Route path="/reviews/write/:bookingId" element={<ReviewForm />} />
            <Route path="/listing/:id/offer" element={<MarketplaceOffer />} />
            <Route path="/supplier-info" element={<ModulePlaceholder moduleKey="supplier-info" />} />
          </Route>
        </Route>
        <Route element={<ProtectedRoute allowedRoles={["customer", "supplier", "admin"]} />}>
          <Route element={<AppShell />}>
            <Route path="/booking/:id" element={<BookingDetail />} />
            <Route path="/inspection/:id" element={<InspectionDetail />} />
            <Route path="/transaction/:id" element={<TransactionDetail />} />
            <Route path="/trade-request/:id" element={<TradeRequestPage />} />
            <Route path="/auction/:auctionId/documents" element={<AuctionDocumentLibraryPage />} />
            <Route path="/auction/:auctionId/document-engine" element={<AuctionDocumentEnginePage />} />
            <Route path="/auction/:auctionId/notification-audit" element={<AuctionNotificationAuditPage />} />
            <Route path="/auction/:auctionId/escrow-ledger" element={<AuctionEscrowLedgerPage />} />
            <Route path="/auction/:auctionId/dispute" element={<AuctionDisputePage />} />
            <Route path="/trust/customer/:customerId" element={<CustomerTrustPage />} />
            <Route path="/protection/booking/:bookingId" element={<BookingProtectionPage />} />
            <Route path="/claims" element={<ClaimsPage />} />
            <Route path="/claims/new/:bookingId" element={<NewClaimPage />} />
            <Route path="/claim/:id" element={<ClaimDetailPage />} />
            <Route path="/disputes" element={<DisputesPage />} />
            <Route path="/disputes/new/:bookingId" element={<NewDisputePage />} />
            <Route path="/dispute/:id" element={<DisputeDetailPage />} />
          </Route>
        </Route>
        <Route element={<ProtectedRoute allowedRoles={["broker", "admin"]} />}>
          <Route element={<AppShell />}>
            <Route path="/brokerage/leads" element={<BrokerageLeads />} />
            <Route path="/dealer/auction-dashboard" element={<DealerAuctionPage />} />
            <Route path="/dealer/bulk-bidding" element={<DealerAuctionPage view="bulk_bidding" />} />
            <Route path="/dealer/fleet-purchases" element={<DealerAuctionPage view="fleet_purchases" />} />
            <Route path="/dealer/dealer-only-auctions" element={<DealerAuctionPage view="dealer_only_auctions" />} />
            <Route path="/dealer/market-intelligence" element={<DealerAuctionPage view="market_intelligence" />} />
            <Route path="/dealer/auction-analytics" element={<DealerAuctionAnalyticsPage />} />
            <Route path="/dealer/notifications" element={<NotificationsPage scope="dealer" />} />
          </Route>
        </Route>
        <Route element={<ProtectedRoute allowedRoles={["supplier"]} />}>
          <Route element={<AppShell />}>
            <Route path="/supplier-dashboard" element={<SupplierDashboard />} />
            <Route path="/inspectors/dashboard" element={<InspectorsDashboardPage />} />
            <Route path="/inspectors/payouts" element={<InspectorsDashboardPage view="payouts" />} />
            <Route path="/transport/dashboard" element={<TransportDashboardPage />} />
            <Route path="/transport/payouts" element={<TransportDashboardPage view="payouts" />} />
            <Route path="/financing/dashboard" element={<FinancingDashboardPage />} />
            <Route path="/financing/payouts" element={<FinancingDashboardPage view="payouts" />} />
            <Route path="/supplier/auctions" element={<SupplierAuctionPage />} />
            <Route path="/supplier/auction-listings" element={<SupplierAuctionPage view="listings" />} />
            <Route path="/supplier/create-auction" element={<SupplierAuctionPage view="create" />} />
            <Route path="/supplier/bulk-auction-upload" element={<SupplierAuctionPage view="bulk" />} />
            <Route path="/supplier/repossession-workflow" element={<SupplierAuctionPage view="repossession" />} />
            <Route path="/supplier/notice-of-sale" element={<SupplierAuctionPage view="notice" />} />
            <Route path="/supplier/proceeds-waterfall" element={<SupplierAuctionPage view="waterfall" />} />
            <Route path="/supplier/auction-analytics" element={<SupplierAuctionAnalyticsPage />} />
            <Route path="/supplier/auction-documents" element={<SupplierAuctionDocumentsPage />} />
            <Route path="/supplier/notifications" element={<NotificationsPage scope="supplier" />} />
            <Route path="/supplier/auction-payouts" element={<SupplierAuctionPage view="payouts" />} />
            <Route path="/list-asset" element={<ListAsset />} />
            <Route path="/my-listings" element={<MyListings />} />
            <Route path="/asset/:id/edit" element={<EditAsset />} />
            <Route path="/assets/:id/edit" element={<EditAsset />} />
            <Route path="/booking/:id/manage" element={<BookingDetail />} />
            <Route path="/inspection/:id/review" element={<InspectionDetail />} />
            <Route path="/rental-requests" element={<SupplierRentalRequests />} />
            <Route path="/earnings" element={<EarningsPage />} />
            <Route path="/payouts" element={<PayoutsPage />} />
            <Route path="/supplier-profile" element={<SupplierProfile />} />
            <Route path="/supplier-profile/edit" element={<SupplierProfileEdit />} />
            <Route path="/verification" element={<VerificationPage />} />
            <Route path="/verification/status" element={<VerificationStatus />} />
          </Route>
        </Route>
        <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
          <Route element={<AppShell />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/listings" element={<AdminListings />} />
            <Route path="/admin/bookings" element={<AdminBookings />} />
            <Route path="/admin/verifications" element={<AdminVerifications />} />
            <Route path="/admin/payments" element={<AdminPayments />} />
            <Route path="/admin/messages" element={<AdminMessages />} />
            <Route path="/admin/support" element={<AdminSupportPage />} />
            <Route path="/admin/reports" element={<AdminReports />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/reviews" element={<AdminReviews />} />
            <Route path="/admin/claims" element={<AdminClaimsPage />} />
            <Route path="/admin/disputes" element={<AdminDisputesPage />} />
            <Route path="/admin/risk" element={<AdminRiskPage />} />
            <Route path="/admin/compliance" element={<AdminCompliance />} />
            <Route path="/admin/revenue" element={<AdminRevenue />} />
            <Route path="/admin/auctions" element={<AdminAuctionPage />} />
            <Route path="/admin/inspectors" element={<AdminInspectorsPage />} />
            <Route path="/admin/transport" element={<AdminTransportProvidersPage />} />
            <Route path="/admin/financing" element={<AdminFinancingPartnersPage />} />
            <Route path="/admin/auction-analytics" element={<AdminAuctionAnalyticsPage />} />
            <Route path="/admin/auction-documents" element={<AdminAuctionDocumentsPage />} />
            <Route path="/admin/notifications" element={<NotificationsPage scope="admin" />} />
            <Route path="/admin/ai-listing-recommendations" element={<AdminAiListingRecommendationsPage />} />
            <Route path="/admin/ai-valuations" element={<AdminAiValuationAuditPage />} />
            <Route path="/admin/system-status" element={<AdminSystemStatusPage />} />
            <Route path="/admin/auction-approvals" element={<AdminAuctionPage view="approvals" />} />
            <Route path="/admin/auction-compliance" element={<AdminAuctionPage view="compliance" />} />
            <Route path="/admin/kyc-review" element={<AdminAuctionPage view="kyc" />} />
            <Route path="/admin/fraud-alerts" element={<AdminAuctionPage view="fraud" />} />
            <Route path="/admin/bid-ledger" element={<AdminAuctionPage view="bid_ledger" />} />
            <Route path="/admin/auction-disputes" element={<AdminAuctionPage view="disputes" />} />
            <Route path="/admin/gct-reports" element={<AdminAuctionPage view="gct" />} />
            <Route path="/admin/government-auctions" element={<AdminAuctionPage view="government" />} />
            <Route path="/admin/court-sales" element={<AdminAuctionPage view="court" />} />
            <Route path="/admin/customs-auctions" element={<AdminAuctionPage view="customs" />} />
            <Route path="/admin/auction-settings" element={<AdminAuctionPage view="settings" />} />
          </Route>
        </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}
