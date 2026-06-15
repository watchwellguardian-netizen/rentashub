import {
  AUCTION_CATEGORIES,
  AUCTION_PARISHES,
  calculateAuctionKpis,
  loadAuctionBids,
  loadAuctionEscrowLedger,
  loadAuctionListings,
  loadAuctionWatchlist,
} from "./auctionService.js";
import { normalizeRole } from "./rbac.js";

function sum(items, selector) {
  return items.reduce((total, item) => total + Number(selector(item) || 0), 0);
}

function percent(part, total) {
  return total ? Math.round((part / total) * 100) : 0;
}

function categoryLabel(categoryId) {
  return AUCTION_CATEGORIES.find((category) => category.id === categoryId)?.label || categoryId.replaceAll("-", " ");
}

function scopeAuctions(storage, user, scope = "admin") {
  const role = normalizeRole(user?.role);
  const auctions = loadAuctionListings(storage);
  if (scope === "supplier" || ["supplier", "vendor"].includes(role)) {
    return auctions.filter((auction) => auction.sellerId === user?.id || auction.sellerId === "review-supplier");
  }
  if (scope === "dealer" || role === "broker") return auctions.filter((auction) => ["live", "extended", "upcoming", "closed", "sold"].includes(auction.status));
  return auctions;
}

export function getAuctionAnalytics(storage, user, scope = "admin") {
  const auctions = scopeAuctions(storage, user, scope);
  const auctionIds = new Set(auctions.map((auction) => auction.id));
  const bids = loadAuctionBids(storage).filter((bid) => auctionIds.has(bid.auctionId));
  const watchlist = loadAuctionWatchlist(storage).filter((item) => auctionIds.has(item.auctionId));
  const escrow = loadAuctionEscrowLedger(storage).filter((entry) => auctionIds.has(entry.auctionId));
  const sold = auctions.filter((auction) => auction.status === "sold");
  const live = auctions.filter((auction) => ["live", "extended"].includes(auction.status));
  const closed = auctions.filter((auction) => ["closed", "sold", "unsold"].includes(auction.status));
  const gmv = sum(auctions, (auction) => auction.currentBid);
  const simulatedBuyerPremium = sum(auctions, (auction) => Number(auction.currentBid || 0) * (Number(auction.buyerPremiumPercent || 0) / 100));
  const reserveGap = sum(auctions, (auction) => Math.max(0, Number(auction.reservePrice || 0) - Number(auction.currentBid || 0)));
  const startingValue = sum(auctions, (auction) => auction.startingBid);
  const recoveryValue = sum(auctions, (auction) => Math.max(Number(auction.currentBid || 0), 0));

  return {
    scope,
    generatedAt: new Date().toISOString(),
    simulationOnly: true,
    notice: "Auction analytics are generated from local/demo records only. No live BI warehouse, external analytics SDK, ad tracking, or production revenue report is active.",
    kpis: {
      ...calculateAuctionKpis(storage),
      totalLots: auctions.length,
      liveLots: live.length,
      closedLots: closed.length,
      soldLots: sold.length,
      gmv,
      simulatedBuyerPremium,
      averageBid: bids.length ? Math.round(sum(bids, (bid) => bid.amount || bid.sealedAmount) / bids.length) : 0,
      averageWatchers: auctions.length ? Math.round(sum(auctions, (auction) => auction.watchers) / auctions.length) : 0,
      sellThroughRate: percent(sold.length, closed.length || auctions.length),
      reserveGap,
      recoveryRate: percent(recoveryValue, startingValue),
      escrowRecords: escrow.length,
    },
    categoryPerformance: AUCTION_CATEGORIES.map((category) => {
      const categoryAuctions = auctions.filter((auction) => auction.category === category.id);
      const categoryBids = bids.filter((bid) => categoryAuctions.some((auction) => auction.id === bid.auctionId));
      return {
        categoryId: category.id,
        label: category.label,
        lots: categoryAuctions.length,
        gmv: sum(categoryAuctions, (auction) => auction.currentBid),
        bids: categoryBids.length,
        watchers: sum(categoryAuctions, (auction) => auction.watchers),
        sellThroughRate: percent(categoryAuctions.filter((auction) => auction.status === "sold").length, categoryAuctions.length),
      };
    }).filter((item) => item.lots || item.bids || item.watchers),
    parishPerformance: AUCTION_PARISHES.map((parish) => {
      const parishAuctions = auctions.filter((auction) => auction.parish === parish);
      return {
        parish,
        lots: parishAuctions.length,
        gmv: sum(parishAuctions, (auction) => auction.currentBid),
        bids: sum(parishAuctions, (auction) => auction.bidCount),
        watchers: sum(parishAuctions, (auction) => auction.watchers),
        reserveGap: sum(parishAuctions, (auction) => Math.max(0, Number(auction.reservePrice || 0) - Number(auction.currentBid || 0))),
      };
    }).filter((item) => item.lots || item.bids || item.watchers),
    bidActivity: bids.map((bid) => {
      const auction = auctions.find((item) => item.id === bid.auctionId);
      return {
        bidId: bid.bidId,
        auctionId: bid.auctionId,
        auctionTitle: auction?.title || "Auction lot",
        bidderId: bid.bidderId,
        bidderName: bid.bidderName,
        bidType: bid.bidType,
        status: bid.status,
        amount: bid.bidType === "sealed" ? 0 : Number(bid.amount || 0),
        sealed: bid.bidType === "sealed",
        createdAt: bid.createdAt,
      };
    }),
    watchlistAnalytics: auctions.map((auction) => ({
      auctionId: auction.id,
      title: auction.title,
      category: categoryLabel(auction.category),
      parish: auction.parish,
      watchers: Number(auction.watchers || 0) + watchlist.filter((item) => item.auctionId === auction.id).length,
      bidCount: Number(auction.bidCount || 0),
      conversionSignal: Number(auction.watchers || 0) ? percent(Number(auction.bidCount || 0), Number(auction.watchers || 0)) : 0,
    })).sort((a, b) => b.watchers - a.watchers),
    sellerRecovery: auctions.map((auction) => ({
      auctionId: auction.id,
      title: auction.title,
      sellerId: auction.sellerId,
      sellerName: auction.sellerName,
      startingBid: Number(auction.startingBid || 0),
      currentBid: Number(auction.currentBid || 0),
      reservePrice: Number(auction.reservePrice || 0),
      reserveGap: Math.max(0, Number(auction.reservePrice || 0) - Number(auction.currentBid || 0)),
      recoveryRate: percent(Number(auction.currentBid || 0), Number(auction.startingBid || 0)),
      status: auction.status,
    })).sort((a, b) => b.currentBid - a.currentBid),
    buyerDealerSummary: {
      uniqueBidders: new Set(bids.map((bid) => bid.bidderId).filter(Boolean)).size,
      dealerBids: bids.filter((bid) => /dealer/i.test(bid.bidderName || "")).length,
      sealedBids: bids.filter((bid) => bid.bidType === "sealed").length,
      proxyBids: bids.filter((bid) => bid.bidType === "proxy").length,
      watchedLots: watchlist.length,
      highBidRecords: bids.filter((bid) => bid.status === "highest").length,
    },
  };
}

export function getAuctionAnalyticsForRole(storage, user) {
  const role = normalizeRole(user?.role);
  if (role === "admin") return getAuctionAnalytics(storage, user, "admin");
  if (["supplier", "vendor"].includes(role)) return getAuctionAnalytics(storage, user, "supplier");
  if (role === "broker") return getAuctionAnalytics(storage, user, "dealer");
  return getAuctionAnalytics(storage, user, "buyer");
}
