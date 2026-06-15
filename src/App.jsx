import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./state/AuthContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AppShell from "./components/AppShell.jsx";
import GlobalBrandMark from "./components/GlobalBrandMark.jsx";
import Login from "./pages/Login.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import CustomerDashboard from "./pages/CustomerDashboard.jsx";
import SupplierDashboard from "./pages/SupplierDashboard.jsx";
import ListAsset from "./pages/ListAsset.jsx";
import MyListings from "./pages/MyListings.jsx";
import AssetDetail from "./pages/AssetDetail.jsx";
import EditAsset from "./pages/EditAsset.jsx";
import BookingRequest from "./pages/BookingRequest.jsx";
import BookingDetail from "./pages/BookingDetail.jsx";
import CustomerBookings from "./pages/CustomerBookings.jsx";
import SupplierRentalRequests from "./pages/SupplierRentalRequests.jsx";
import InspectionForm from "./pages/InspectionForm.jsx";
import InspectionDetail from "./pages/InspectionDetail.jsx";
import BookingPayment from "./pages/BookingPayment.jsx";
import PaymentsPage from "./pages/PaymentsPage.jsx";
import WalletPage from "./pages/WalletPage.jsx";
import EarningsPage from "./pages/EarningsPage.jsx";
import PayoutsPage from "./pages/PayoutsPage.jsx";
import TransactionDetail from "./pages/TransactionDetail.jsx";
import MessagesPage from "./pages/MessagesPage.jsx";
import NotificationsPage from "./pages/NotificationsPage.jsx";
import SupplierProfile from "./pages/SupplierProfile.jsx";
import SupplierProfileEdit from "./pages/SupplierProfileEdit.jsx";
import VerificationPage from "./pages/VerificationPage.jsx";
import VerificationStatus from "./pages/VerificationStatus.jsx";
import { AdminBookings, AdminCompliance, AdminDashboard, AdminListings, AdminMessages, AdminPayments, AdminReports, AdminRevenue, AdminSettings, AdminUsers, AdminVerifications } from "./pages/AdminCenter.jsx";
import { AdminReviews } from "./pages/AdminCenter.jsx";
import ReviewForm from "./pages/ReviewForm.jsx";
import { AssetReviewsPage, ReviewsPage, SupplierReviewsPage } from "./pages/ReviewsPage.jsx";
import MarketplaceSearch from "./pages/MarketplaceSearch.jsx";
import CategoryPage from "./pages/CategoryPage.jsx";
import CategoryProductPage from "./pages/CategoryProductPage.jsx";
import ModulePlaceholder from "./pages/ModulePlaceholder.jsx";
import { MarketplaceLanding, TradeRequestPage, WantedPage } from "./pages/ExchangeMarketplace.jsx";
import MarketplaceOffer from "./pages/MarketplaceOffer.jsx";
import BrokerageLeads from "./pages/BrokerageLeads.jsx";
import { AdminRiskPage, AssetTrustPage, CustomerTrustPage, SupplierTrustPage, TrustOverview } from "./pages/TrustCenter.jsx";
import { AdminAiListingRecommendationsPage, AdminAiValuationAuditPage, AiBrokerAssistantPage, AiHome, AiListingAssistantPage, AiMarketInsightsPage, AiRentalAdvisorPage, AiSearchPage, AiValuationEnginePage } from "./pages/AiAssistant.jsx";
import { AdminClaimsPage, AssetProtectionPage, BookingProtectionPage, ClaimDetailPage, ClaimsPage, NewClaimPage, ProtectionOverview, ProtectionPlansPage } from "./pages/ProtectionPages.jsx";
import { AdminDisputesPage, DisputeDetailPage, DisputesPage, NewDisputePage } from "./pages/DisputePages.jsx";
import { AdminAuctionPage, AuctionBidPage, AuctionCategoryPage, AuctionDetail, AuctionDisputePage, AuctionDocumentLibraryPage, AuctionEscrowLedgerPage, AuctionNotificationAuditPage, AuctionParishPage, AuctionStaticPage, AuctionSupportPage, AuctionsLanding, BuyerAuctionPage, DealerAuctionPage, SupplierAuctionPage } from "./pages/AuctionPages.jsx";
import { AdminInspectorsPage, AuctionInspectionRequestPage, InspectorRegistrationPage, InspectorsDashboardPage, InspectorsDirectoryPage } from "./pages/InspectionMarketplacePages.jsx";
import { AdminTransportProvidersPage, AuctionTransportRequestPage, TransportDashboardPage, TransportDirectoryPage, TransportRegistrationPage } from "./pages/TransportMarketplacePages.jsx";
import { AdminFinancingPartnersPage, AuctionFinancingRequestPage, FinancingDashboardPage, FinancingDirectoryPage, FinancingProductsPage, FinancingRegistrationPage } from "./pages/FinancingMarketplacePages.jsx";
import { AdminAuctionAnalyticsPage, DealerAuctionAnalyticsPage, SupplierAuctionAnalyticsPage } from "./pages/AuctionAnalyticsPages.jsx";
import { AdminAuctionDocumentsPage, AuctionDocumentEnginePage, BuyerAuctionDocumentsPage, SupplierAuctionDocumentsPage } from "./pages/AuctionDocumentEnginePages.jsx";

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
            <Route path="/reviews" element={<ReviewsPage />} />
            <Route path="/ai-help" element={<AiHome />} />
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
    </>
  );
}
