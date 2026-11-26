import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const featureFormSchema = z.object({
  name: z.string().trim().min(1, "Enter a feature name").max(120),
  events: z.string().trim().min(1, "Add at least one event").refine((value) => {
    const events = [...new Set(value.split(/[\n,]+/).map((event) => event.trim()).filter(Boolean))];
    return events.length > 0 && events.length <= 500;
  }, {
    message: "Add between 1 and 500 unique events",
  }),
});

type Props = {
  knownEvents: string[] | null;
  onCreate: (name: string, events: string[]) => Promise<void>;
};

export function FeatureForm({ knownEvents, onCreate }: Props) {
  const [formError, setFormError] = useState("");
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } =
    useForm<z.infer<typeof featureFormSchema>>({ resolver: zodResolver(featureFormSchema) });

  const submit = handleSubmit(async ({ name, events: eventText }) => {
    const events = [...new Set(eventText.split(/[\n,]+/).map((event) => event.trim()).filter(Boolean))];
    const unknownEvents = knownEvents
      ? events.filter((event) => !knownEvents.includes(event))
      : [];
    if (unknownEvents.length) {
      setError("events", { message: `Not found in the selected GA4 date range: ${unknownEvents.slice(0, 5).join(", ")}` });
      return;
    }
    try {
      setFormError("");
      await onCreate(name, events);
      reset();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not create this feature");
    }
  });

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-4">
      <div>
        <label className="label" htmlFor="feature-name">Feature name</label>
        <input id="feature-name" className="field" placeholder="Checkout flow" {...register("name")} />
        {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name.message}</p>}
      </div>
      <div>
        <label className="label" htmlFor="feature-events">Ordered event names</label>
        <textarea
          id="feature-events"
          className="field min-h-32 resize-y"
          placeholder={"checkout_started\npayment_submitted\npurchase_completed"}
          {...register("events")}
        />
        <p className="mt-1.5 text-xs leading-5 text-slate-500">
          Paste 1–500 event names, one per line or comma-separated. Their order is preserved.
        </p>
        {errors.events && <p className="mt-1 text-xs text-rose-600">{errors.events.message}</p>}
      </div>
      {formError && <p role="alert" className="text-xs text-rose-600">{formError}</p>}
      <button className="button-primary w-full" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : "Create feature"}
      </button>
    </form>
  );
}
