import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../components/Button.jsx";
import { bookingAdapter } from "../lib/adapters/bookingAdapter.js";
import { inspectionAdapter } from "../lib/adapters/inspectionAdapter.js";
import {
  CONDITION_ITEMS,
  canCheckInBooking,
  canCheckOutBooking,
  createEmptyInspectionInput,
  hasAccessoryFields,
  hasEngineHoursField,
  hasMeterFields,
  hasOdometerField,
} from "../lib/inspectionService.js";
import { useAuth } from "../state/AuthContext.jsx";

export default function InspectionForm({ type }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [context, setContext] = useState({ booking: null, listing: null });
  const [form, setForm] = useState(createEmptyInspectionInput());
  const [errors, setErrors] = useState({});
  const [pageError, setPageError] = useState(null);

  const isCheckIn = type === "check-in";

  useEffect(() => {
    document.title = isCheckIn ? "RentasHub - Digital Check-In" : "RentasHub - Digital Check-Out";
  }, [isCheckIn]);

  useEffect(() => {
    let active = true;
    Promise.resolve(bookingAdapter.resolveContext(window.localStorage, id, { user }))
      .then((next) => {
        if (!active) return;
        if (!next.booking) {
          setPageError("Booking was not found.");
          return;
        }
        if (isCheckIn && !canCheckInBooking(user, next.booking)) {
          setPageError("Check-in is available only for your own approved or active booking.");
          return;
        }
        if (!isCheckIn && !canCheckOutBooking(user, next.booking)) {
          setPageError("Check-out is available only for your own active booking.");
          return;
        }
        setContext(next);
      })
      .catch((err) => {
        if (active) setPageError(err.message || "Booking was not found.");
      });
    return () => {
      active = false;
    };
  }, [id, isCheckIn, user]);

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const setChecklist = (item, checked) => {
    setForm((current) => ({
      ...current,
      checklist: { ...current.checklist, [item]: checked },
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    try {
      const result = await Promise.resolve(inspectionAdapter.submit(window.localStorage, {
        type,
        user,
        booking: context.booking,
        listing: context.listing,
        input: form,
      }, { user }));
      if (!result.valid) {
        setErrors(result.errors);
        return;
      }
      navigate(`/inspection/${result.inspection.id}`);
    } catch (err) {
      setErrors({ api: err.message || "Inspection API mode could not submit this inspection." });
    }
  };

  if (pageError) return <main className="page center-page"><section className="panel narrow error-panel">{pageError}</section></main>;
  if (!context.booking) return <main className="page center-page">Loading inspection flow...</main>;

  const { booking, listing } = context;

  return (
    <main className="page dashboard-grid">
      <section className="hero-panel">
        <p className="eyebrow">RentasHub</p>
        <h1>{isCheckIn ? "RentasHub Digital Check-In" : "RentasHub Digital Check-Out"}</h1>
        <p>{booking.assetTitle}</p>
        <span className="role-pill">{isCheckIn ? "Marks booking active" : "Marks booking completed"}</span>
      </section>

      <form className="panel wide form-grid" onSubmit={submit}>
        <div className="section-heading form-span"><span>{isCheckIn ? "Pre-rental condition checklist" : "Return condition checklist"}</span></div>
        {Object.values(errors).map((error) => <p className="field-error form-span" key={error}>{error}</p>)}

        <label>Condition status
          <select value={form.conditionStatus} onChange={(event) => setField("conditionStatus", event.target.value)}>
            <option value="excellent">Excellent</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="damage-noted">Damage noted</option>
          </select>
        </label>

        <section className="form-span checklist-box">
          {CONDITION_ITEMS.map((item) => (
            <label className="checkbox-line" key={item}>
              <input type="checkbox" checked={Boolean(form.checklist[item])} onChange={(event) => setChecklist(item, event.target.checked)} />
              {item}
            </label>
          ))}
        </section>

        <section className="photo-placeholder form-span">
          <strong>Photo upload coming soon / upload-ready</strong>
          <p>Inspection photos are stored as metadata placeholders until real file storage is added.</p>
        </section>

        {hasMeterFields(listing) ? (
          <label>Fuel / battery / charge level
            <input value={form.fuelBatteryLevel} onChange={(event) => setField("fuelBatteryLevel", event.target.value)} placeholder="Example: 75%, full tank, 60% charge" />
          </label>
        ) : null}
        {hasOdometerField(listing) ? (
          <label>Odometer reading
            <input value={form.odometer} onChange={(event) => setField("odometer", event.target.value)} placeholder="Enter vehicle/truck odometer" />
          </label>
        ) : null}
        {hasEngineHoursField(listing) ? (
          <label>Engine hours
            <input value={form.engineHours} onChange={(event) => setField("engineHours", event.target.value)} placeholder="Enter equipment engine hours" />
          </label>
        ) : null}
        {hasAccessoryFields(listing) && isCheckIn ? (
          <label className="form-span">Accessories included
            <textarea value={form.accessoriesIncluded} onChange={(event) => setField("accessoriesIncluded", event.target.value)} placeholder="List accessories handed over with the asset." />
          </label>
        ) : null}
        {hasAccessoryFields(listing) && !isCheckIn ? (
          <label className="form-span">Missing accessories
            <textarea value={form.missingAccessories} onChange={(event) => setField("missingAccessories", event.target.value)} placeholder="List missing accessories or write none." />
          </label>
        ) : null}
        <label className="form-span">Customer notes
          <textarea value={form.customerNotes} onChange={(event) => setField("customerNotes", event.target.value)} placeholder="Add condition notes for this inspection." />
        </label>
        {!isCheckIn ? (
          <label className="form-span">Damage notes
            <textarea value={form.damageNotes} onChange={(event) => setField("damageNotes", event.target.value)} placeholder="Describe damage, wear, or return concerns. Write none if clear." />
          </label>
        ) : null}
        <label className="form-span">Location placeholder / GPS-ready metadata
          <input value={form.locationLabel} onChange={(event) => setField("locationLabel", event.target.value)} placeholder="Example: Supplier yard, customer pickup site, jobsite gate" />
        </label>
        <p className="muted form-span">Timestamp is captured when this form is submitted. GPS and file uploads are structured for future backend/API storage.</p>
        <div className="form-actions">
          <Button variant="secondary" type="button" onClick={() => navigate(`/booking/${booking.id}`)}>Back to booking</Button>
          <Button type="submit">{isCheckIn ? "Submit check-in" : "Submit check-out"}</Button>
        </div>
      </form>
    </main>
  );
}
