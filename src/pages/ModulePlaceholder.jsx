import { Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button.jsx";

const MODULES = {
  search: ["Asset Search", "Advanced rental and brokerage search will be built in its own sequential module."],
  bookings: ["Bookings", "Booking requests, confirmations, amendments, and calendars will open after approval."],
  messages: ["Messages", "Customer, supplier, broker, and support messaging will open in the messaging module."],
  "ai-help": ["AI Help", "RentasHub AI search and booking guidance will be built as its own assistant."],
  "list-asset": ["List an Asset", "Asset listing creation will open after the supplier dashboard and listing modules are approved."],
  "supplier-info": ["List an Asset", "Supplier registration and account upgrade guidance will open in the onboarding module."],
  "my-listings": ["My Listings", "Supplier listing management will open in the asset listing module."],
  "rental-requests": ["Rental Requests", "Request review, negotiation, and confirmation tools will open in the booking workflow module."],
  earnings: ["Earnings", "Supplier revenue, commission, deposit, and payout details will open in the payment module."],
};

export default function ModulePlaceholder({ moduleKey }) {
  const navigate = useNavigate();
  const [title, message] = MODULES[moduleKey] || MODULES.search;

  return (
    <main className="page center-page">
      <section className="panel narrow">
        <p className="eyebrow">RentasHub</p>
        <Clock aria-hidden="true" />
        <h1>{title}</h1>
        <p>{message}</p>
        <Button onClick={() => navigate("/dashboard")}>Back to dashboard</Button>
      </section>
    </main>
  );
}
