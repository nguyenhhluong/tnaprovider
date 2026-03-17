import { useState } from "react";
import { SectionTitle } from "../components/ui/SectionTitle";
import { Button } from "../components/ui/Button";
import { MapPin, Phone, Mail, Clock, CheckCircle2 } from "lucide-react";

export function Contact() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    service: "",
    message: "",
    requestCallback: false,
    callbackTime: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  const validateField = (name: string, value: string | boolean) => {
    let error = "";
    switch (name) {
      case "firstName":
        if (!value) error = "First name is required";
        break;
      case "lastName":
        if (!value) error = "Last name is required";
        break;
      case "email":
        if (!value) {
          error = "Email is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value as string)) {
          error = "Invalid email format";
        }
        break;
      case "phone":
        if (!value) {
          error = "Phone number is required";
        } else if (!/^[\d\s+()-]{8,20}$/.test(value as string)) {
          error = "Invalid phone number";
        }
        break;
      case "service":
        if (!value) error = "Please select a service";
        break;
      case "message":
        if (!value) error = "Message is required";
        else if ((value as string).length < 10) error = "Message must be at least 10 characters";
        break;
      case "callbackTime":
        if (formData.requestCallback && !value) error = "Please select a preferred time";
        break;
      default:
        break;
    }
    return error;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === "checkbox" ? (e.target as HTMLInputElement).checked : value;
    
    setFormData(prev => ({ ...prev, [name]: val }));
    
    const error = validateField(name, val);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === "checkbox" ? (e.target as HTMLInputElement).checked : value;
    const error = validateField(name, val);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    const newErrors: Record<string, string> = {};
    Object.keys(formData).forEach(key => {
      const error = validateField(key, formData[key as keyof typeof formData]);
      if (error) newErrors[key] = error;
    });

    if (formData.requestCallback && !formData.callbackTime) {
      newErrors.callbackTime = "Please select a preferred time";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      // Simulate API call
      setTimeout(() => {
        setIsSubmitted(true);
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          service: "",
          message: "",
          requestCallback: false,
          callbackTime: "",
        });
      }, 1000);
    }
  };

  return (
    <div className="flex flex-col min-h-screen pt-24">
      {/* Hero */}
      <section className="bg-brand-darker text-white py-24 md:py-32 relative overflow-hidden">
        <div className="container relative z-10 mx-auto px-4 md:px-8">
          <div className="max-w-3xl">
            <SectionTitle 
              subtitle="Get in Touch"
              title="Start Your Next Commercial Project"
              light
            />
            <p className="mt-6 text-xl text-gray-300 leading-relaxed">
              Contact TNA Provider today to discuss your construction, joinery, or shopfitting requirements. We provide end-to-end solutions across Australia.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Content */}
      <section className="py-24 bg-brand-gray dark:bg-brand-darker">
        <div className="container mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            
            {/* Contact Form */}
            <div className="bg-white dark:bg-gray-900 p-8 md:p-12 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
              {isSubmitted ? (
                <div className="flex flex-col items-center justify-center text-center py-12 h-full">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-3xl font-display font-bold text-brand-dark dark:text-white mb-4">Request Received</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-8">
                    Thank you for reaching out. Our team will review your project details and get back to you shortly.
                  </p>
                  <Button onClick={() => setIsSubmitted(false)}>Send Another Message</Button>
                </div>
              ) : (
                <>
                  <h3 className="text-3xl font-display font-bold text-brand-dark dark:text-white mb-8">Request a Quote</h3>
                  <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex flex-col gap-2">
                        <label htmlFor="firstName" className="text-sm font-semibold text-gray-700 dark:text-gray-300">First Name <span className="text-red-500">*</span></label>
                        <input 
                          type="text" 
                          id="firstName" 
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          className={`h-12 px-4 rounded-lg border ${errors.firstName ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-700 focus:border-brand-accent focus:ring-brand-accent'} bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 transition-colors`}
                          placeholder="John"
                        />
                        {errors.firstName && <span className="text-xs text-red-500">{errors.firstName}</span>}
                      </div>
                      <div className="flex flex-col gap-2">
                        <label htmlFor="lastName" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Last Name <span className="text-red-500">*</span></label>
                        <input 
                          type="text" 
                          id="lastName" 
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          className={`h-12 px-4 rounded-lg border ${errors.lastName ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-700 focus:border-brand-accent focus:ring-brand-accent'} bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 transition-colors`}
                          placeholder="Doe"
                        />
                        {errors.lastName && <span className="text-xs text-red-500">{errors.lastName}</span>}
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <label htmlFor="email" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Email Address <span className="text-red-500">*</span></label>
                      <input 
                        type="email" 
                        id="email" 
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={`h-12 px-4 rounded-lg border ${errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-700 focus:border-brand-accent focus:ring-brand-accent'} bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 transition-colors`}
                        placeholder="john@example.com"
                      />
                      {errors.email && <span className="text-xs text-red-500">{errors.email}</span>}
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <label htmlFor="phone" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Phone Number <span className="text-red-500">*</span></label>
                      <input 
                        type="tel" 
                        id="phone" 
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={`h-12 px-4 rounded-lg border ${errors.phone ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-700 focus:border-brand-accent focus:ring-brand-accent'} bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 transition-colors`}
                        placeholder="0406 409 668"
                      />
                      {errors.phone && <span className="text-xs text-red-500">{errors.phone}</span>}
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <label htmlFor="service" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Service Required <span className="text-red-500">*</span></label>
                      <select 
                        id="service" 
                        name="service"
                        value={formData.service}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={`h-12 px-4 rounded-lg border ${errors.service ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-700 focus:border-brand-accent focus:ring-brand-accent'} bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 transition-colors`}
                      >
                        <option value="">Select a service...</option>
                        <option value="joinery">Custom Joinery Manufacturing</option>
                        <option value="shopfitting">Shopfitting & Fitouts</option>
                        <option value="construction">Commercial Construction</option>
                        <option value="metalwork">Architectural Metalwork</option>
                        <option value="design">Design & Planning</option>
                      </select>
                      {errors.service && <span className="text-xs text-red-500">{errors.service}</span>}
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <label htmlFor="message" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Project Details <span className="text-red-500">*</span></label>
                      <textarea 
                        id="message" 
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        rows={5}
                        className={`p-4 rounded-lg border ${errors.message ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-700 focus:border-brand-accent focus:ring-brand-accent'} bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 transition-colors resize-none`}
                        placeholder="Tell us about your project scope, timeline, and budget..."
                      ></textarea>
                      {errors.message && <span className="text-xs text-red-500">{errors.message}</span>}
                    </div>

                    <div className="flex flex-col gap-4 p-4 bg-brand-gray dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          id="requestCallback" 
                          name="requestCallback"
                          checked={formData.requestCallback}
                          onChange={handleChange}
                          className="w-5 h-5 rounded border-gray-300 text-brand-accent focus:ring-brand-accent"
                        />
                        <label htmlFor="requestCallback" className="text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                          Request a Callback
                        </label>
                      </div>
                      
                      {formData.requestCallback && (
                        <div className="flex flex-col gap-2 pl-8">
                          <label htmlFor="callbackTime" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Preferred Time <span className="text-red-500">*</span></label>
                          <select 
                            id="callbackTime" 
                            name="callbackTime"
                            value={formData.callbackTime}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            className={`h-12 px-4 rounded-lg border ${errors.callbackTime ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-700 focus:border-brand-accent focus:ring-brand-accent'} bg-white dark:bg-gray-800 text-brand-dark dark:text-white focus:outline-none focus:ring-1 transition-colors`}
                          >
                            <option value="">Select preferred time...</option>
                            <option value="morning">Morning (8:00 AM - 12:00 PM)</option>
                            <option value="afternoon">Afternoon (12:00 PM - 5:00 PM)</option>
                            <option value="evening">Evening (After 5:00 PM)</option>
                          </select>
                          {errors.callbackTime && <span className="text-xs text-red-500">{errors.callbackTime}</span>}
                        </div>
                      )}
                    </div>
                    
                    <Button type="submit" size="lg" className="w-full mt-2">
                      Submit Request
                    </Button>
                  </form>
                </>
              )}
            </div>
            
            {/* Contact Details */}
            <div className="flex flex-col gap-12">
              <div className="flex flex-col gap-8">
                <SectionTitle 
                  subtitle="Contact Information"
                  title="We're Here to Help"
                />
                <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                  Our team is ready to discuss your next commercial project. Reach out via phone, email, or visit our office.
                </p>
              </div>
              
              <div className="flex flex-col gap-8">
                <div className="flex items-start gap-6">
                  <div className="w-14 h-14 rounded-full bg-white dark:bg-gray-900 shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-center text-brand-accent flex-shrink-0">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-brand-dark dark:text-white mb-2">Office & Manufacturing</h4>
                    <p className="text-gray-600 dark:text-gray-400">
                      16/46 Wellington Road<br />
                      South Granville, NSW, 2142
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-6">
                  <div className="w-14 h-14 rounded-full bg-white dark:bg-gray-900 shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-center text-brand-accent flex-shrink-0">
                    <Phone className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-brand-dark dark:text-white mb-2">Phone</h4>
                    <a href="tel:0406409668" className="text-gray-600 dark:text-gray-400 hover:text-brand-accent dark:hover:text-brand-accent transition-colors text-lg">
                      0406 409 668
                    </a>
                  </div>
                </div>
                
                <div className="flex items-start gap-6">
                  <div className="w-14 h-14 rounded-full bg-white dark:bg-gray-900 shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-center text-brand-accent flex-shrink-0">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-brand-dark dark:text-white mb-2">Email</h4>
                    <a href="mailto:info@tnaprovider.com.au" className="text-gray-600 dark:text-gray-400 hover:text-brand-accent dark:hover:text-brand-accent transition-colors text-lg">
                      info@tnaprovider.com.au
                    </a>
                  </div>
                </div>
                
                <div className="flex items-start gap-6">
                  <div className="w-14 h-14 rounded-full bg-white dark:bg-gray-900 shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-center text-brand-accent flex-shrink-0">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-brand-dark dark:text-white mb-2">Business Hours</h4>
                    <p className="text-gray-600 dark:text-gray-400">
                      Monday - Friday: 7:00 AM - 5:00 PM<br />
                      Saturday: By Appointment<br />
                      Sunday: Closed
                    </p>
                    <p className="text-sm text-brand-accent mt-2 font-medium">
                      * After-hours construction work available upon request.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Map Placeholder */}
              <div className="w-full h-64 bg-gray-200 dark:bg-gray-800 rounded-2xl overflow-hidden relative mt-4">
                <div className="absolute inset-0 flex items-center justify-center flex-col gap-2 text-gray-500 dark:text-gray-400">
                  <MapPin className="w-8 h-8" />
                  <span className="font-medium">Interactive Map Placeholder</span>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </section>
    </div>
  );
}
