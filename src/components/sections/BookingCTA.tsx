import { Button } from "../ui/Button";
import { Calendar, Phone, Mail } from "lucide-react";

const bookingUrl = import.meta.env.VITE_BOOKING_URL as string | undefined;

export function BookingCTA() {
  if (bookingUrl) {
    return (
      <div className="bg-brand-darker rounded-2xl p-8 md:p-12 text-center border border-white/10">
        <div className="w-16 h-16 rounded-full bg-brand-accent/20 flex items-center justify-center mx-auto mb-6">
          <Calendar className="w-8 h-8 text-brand-accent" />
        </div>
        <h3 className="text-2xl md:text-3xl font-display font-bold text-white mb-4">
          Book a 15-Minute Project Call
        </h3>
        <p className="text-gray-300 mb-8 max-w-lg mx-auto">
          Tell us about your project and we'll let you know if we're the right fit — no pressure, no obligation.
        </p>
        <Button asChild size="lg">
          <a href={bookingUrl} target="_blank" rel="noopener noreferrer">
            <Calendar className="w-5 h-5 mr-2" />
            Book a Call
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-brand-darker rounded-2xl p-8 md:p-12 text-center border border-white/10">
      <h3 className="text-2xl md:text-3xl font-display font-bold text-white mb-4">
        Ready to Start Your Project?
      </h3>
      <p className="text-gray-300 mb-8 max-w-lg mx-auto">
        Call us or submit a contact form and we'll get back to you within 24 hours.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <Button asChild size="lg">
          <a href="tel:0406409668">
            <Phone className="w-5 h-5 mr-2" />
            Call 0406 409 668
          </a>
        </Button>
        <Button asChild variant="outline" size="lg" className="bg-white/5 border-white/20 text-white hover:bg-white/10 hover:text-white">
          <a href="mailto:info@tnaprovider.com.au">
            <Mail className="w-5 h-5 mr-2" />
            Send an Email
          </a>
        </Button>
      </div>
    </div>
  );
}
