import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../components/Button.jsx";
import { assetAdapter } from "../lib/adapters/assetAdapter.js";
import { bookingAdapter } from "../lib/adapters/bookingAdapter.js";
import { estimateBookingCost, validateBookingRequest } from "../lib/bookingService.js";
import { useAuth } from "../state/AuthContext.jsx";

const EMPTY_FORM = {
  startDateTime: "",
  endDateTime: "",
  pickupDeliveryMethod: "pickup",
  deliveryLocation: "",
  notes: "",
};

export default function BookingRequest() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [pageError, setPageError] = useState(null);

  useEffect(() => {
    document.title = "RentasHub - Request Booking";
  }, []);

  useEffect(() => {
    let active = true;
    Promise.resolve(assetAdapter.getById(window.localStorage, id))
      .then((found) => {
        if (!active) return;
        if (!found) {
          setPageError("Asset listing was not found.");
          return;
        }
        setListing(found);
      })
      .catch((err) => {
        if (active) setPageError(err.message || "Asset listing was not found.");
      });
    return () => {
      active = false;
    };
  }, [id]);

  const estimate = useMemo(() => (
    listing ? estimateBookingCost(listing, form.startDateTime, form.endDateTime) : { estimatedCost: 0, label: "Dates not ready" }
  ), [form.endDateTime, form.startDateTime, listing]);

  const setField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "pickupDeliveryMethod" && value === "pickup" ? { deliveryLocation: "" } : {}),
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    const validation = validateBookingRequest({
      user,
      listing,
      input: form,
      existingBookings: [],
    });
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    try {
      const result = await Promise.resolve(bookingAdapter.createRequest(window.localStorage, { user, listing, input: form }, { user }));
      if (!result.valid) {
        setErrors(result.errors);
        return;
      }
      navigate(`/booking/${result.booking.id}`);
    } catch (err) {
      setErrors({ api: err.message || "Booking API mode could not create this request." });
    }
  };

  if (pageError) return <main className="page center-page"><section className="panel narrow">{pageError}</section></main>;
  if (!listing) return <main className="page center-page">Loading booking request...</main>;

  return (
    <main className="page dashboard-grid">
      <section className="hero-panel">
        <p className="eyebrow">RentasHub</p>
        <h1>Request booking</h1>
        <p>{listing.title}</p>
        <span className="role-pill">Payment is not active yet</span>
      </section>

      <form className="panel wide form-grid" onSubmit={submit}>
        <div className="section-heading form-span"><span>Booking details</span></div>
        {errors.user ? <p className="field-error form-span">{errors.user}</p> : null}
        {errors.asset ? <p className="field-error form-span">{errors.asset}</p> : null}
        {errors.overlap ? <p className="field-error form-span">{errors.overlap}</p> : null}
        {errors.api ? <p className="field-error form-span">{errors.api}</p> : null}

        <label>Rental start date/time
          <input type="datetime-local" value={form.startDateTime} onChange={(event) => setField("startDateTime", event.target.value)} />
          {errors.startDateTime ? <span className="field-error">{errors.startDateTime}</span> : null}
        </label>
        <label>Rental end date/time
          <input type="datetime-local" value={form.endDateTime} onChange={(event) => setField("endDateTime", event.target.value)} />
          {errors.endDateTime ? <span className="field-error">{errors.endDateTime}</span> : null}
        </label>
        <label>Pickup or delivery
          <select value={form.pickupDeliveryMethod} onChange={(event) => setField("pickupDeliveryMethod", event.target.value)}>
            <option value="pickup">Pickup</option>
            <option value="delivery">Delivery</option>
          </select>
          {errors.pickupDeliveryMethod ? <span className="field-error">{errors.pickupDeliveryMethod}</span> : null}
        </label>
        {form.pickupDeliveryMethod === "delivery" ? (
          <label>Delivery location
            <input value={form.deliveryLocation} onChange={(event) => setField("deliveryLocation", event.target.value)} placeholder="Enter delivery address or area" />
            {errors.deliveryLocation ? <span className="field-error">{errors.deliveryLocation}</span> : null}
          </label>
        ) : null}
        <label className="form-span">Notes or special request
          <textarea value={form.notes} onChange={(event) => setField("notes", event.target.value)} placeholder="Share timing, access, delivery, or usage notes for the supplier." />
        </label>

        <section className="booking-estimate form-span">
          <div><span>Estimated duration</span><strong>{estimate.label}</strong></div>
          <div><span>Estimated rental cost</span><strong>JMD {Number(estimate.estimatedCost || 0).toLocaleString()}</strong></div>
          <div><span>Deposit requirement</span><strong>{listing.depositRequirement}</strong></div>
          <div><span>Payment</span><strong>Not active yet</strong></div>
        </section>

        <p className="muted form-span">No payment will be charged. This creates a request with status pending supplier approval.</p>
        <div className="form-actions">
          <Button variant="secondary" type="button" onClick={() => navigate(`/asset/${listing.id}`)}>Back to asset</Button>
          <Button type="submit">Submit booking request</Button>
        </div>
      </form>
    </main>
  );
}
