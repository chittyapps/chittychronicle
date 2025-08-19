import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import ChittyAuth from "@/components/ChittyAuth";
import { Shield, CheckCircle, Clock, DollarSign, Users, Star, Phone, Mail, Home, IdCard, Building, Briefcase, University, GraduationCap, Car, ShoppingCart } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 chitty-gradient-l2 rounded-lg flex items-center justify-center">
                  <Shield className="text-white text-sm" />
                </div>
                <span className="text-xl font-bold text-slate-900">ChittyID</span>
              </div>
              <div className="hidden md:flex space-x-6">
                <a href="/individuals" className="text-slate-600 hover:text-slate-900 transition-colors" data-testid="nav-individuals">For Individuals</a>
                <a href="/businesses" className="text-slate-600 hover:text-slate-900 transition-colors" data-testid="nav-businesses">For Businesses</a>
                <a href="/developers" className="text-slate-600 hover:text-slate-900 transition-colors" data-testid="nav-developers">Developers</a>
                <a href="/security" className="text-slate-600 hover:text-slate-900 transition-colors" data-testid="nav-security">Security</a>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => document.getElementById('auth')?.scrollIntoView({ behavior: 'smooth' })} data-testid="button-signin">
                Sign In
              </Button>
              <Button onClick={() => document.getElementById('auth')?.scrollIntoView({ behavior: 'smooth' })} data-testid="button-get-verified">
                Get Verified
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-white pt-16 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="inline-flex items-center bg-blue-100 text-blue-600 mb-6" data-testid="badge-trusted">
                <CheckCircle className="mr-2 h-4 w-4" />
                Trusted by 10,000+ businesses
              </Badge>
              <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-6 leading-tight" data-testid="text-hero-title">
                One Identity,<br />
                <span className="trust-element">Trusted Everywhere</span>
              </h1>
              <p className="text-xl text-slate-600 mb-8 leading-relaxed" data-testid="text-hero-description">
                Stop proving who you are over and over. Get verified once with ChittyID and instantly access apartments, bank accounts, and services across our trusted network.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" onClick={() => document.getElementById('auth')?.scrollIntoView({ behavior: 'smooth' })} data-testid="button-start-verification">
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Start Verification
                </Button>
                <Button variant="outline" size="lg" data-testid="button-watch-demo">
                  <svg className="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                  Watch Demo
                </Button>
              </div>
            </div>
            <div className="relative">
              {/* Trust Score Visualization */}
              <div className="chitty-gradient-soft rounded-2xl p-8">
                <Card className="mb-6" data-testid="card-chittyid-demo">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-slate-900" data-testid="text-chittyid-title">Your ChittyID</h3>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-600" data-testid="badge-verified">
                        Verified
                      </Badge>
                    </div>
                    <div className="text-2xl font-mono identity-element mb-4" data-testid="text-chittyid-code">CH-2024-VER-1234-A</div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600" data-testid="text-trust-score-label">Trust Score</span>
                        <div className="flex items-center space-x-2">
                          <Progress value={85} className="w-20" data-testid="progress-trust-score" />
                          <span className="text-sm font-semibold text-blue-600" data-testid="text-trust-score-value">847</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="flex items-center space-x-2">
                          <IdCard className="text-blue-600 h-4 w-4" />
                          <span className="text-sm text-slate-600" data-testid="text-id-verified">ID Verified</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Home className="text-orange-600 h-4 w-4" />
                          <span className="text-sm text-slate-600" data-testid="text-address-confirmed">Address Confirmed</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Phone className="text-red-600 h-4 w-4" />
                          <span className="text-sm text-slate-600" data-testid="text-phone-verified">Phone Verified</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Mail className="text-yellow-600 h-4 w-4" />
                          <span className="text-sm text-slate-600" data-testid="text-email-confirmed">Email Confirmed</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <div className="grid grid-cols-2 gap-4">
                  <Card data-testid="card-trusted-businesses">
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-blue-600 mb-1" data-testid="text-business-count">23</div>
                      <div className="text-xs text-slate-600" data-testid="text-business-label">Trusted Businesses</div>
                    </CardContent>
                  </Card>
                  <Card data-testid="card-success-rate">
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-blue-600 mb-1" data-testid="text-success-rate">100%</div>
                      <div className="text-xs text-slate-600" data-testid="text-success-label">Success Rate</div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem/Solution Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4" data-testid="text-problem-title">The Identity Verification Problem</h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto" data-testid="text-problem-description">
              Every business interaction requires proving your identity from scratch, creating friction and frustration for everyone involved.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-16 items-center mb-20">
            <div>
              <h3 className="text-2xl font-bold text-slate-900 mb-6" data-testid="text-old-way-title">The Old Way is Broken</h3>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="text-red-600 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.3 5.71L12 12.01l-6.3-6.3-1.42 1.42L10.59 13.5l-6.3 6.3 1.42 1.42L12 14.91l6.3 6.3 1.42-1.42L13.41 13.5l6.3-6.3z"/>
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2" data-testid="text-endless-docs-title">Endless Document Requests</h4>
                    <p className="text-slate-600" data-testid="text-endless-docs-description">Upload the same ID, proof of income, and references for every apartment application.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <Clock className="text-red-600 h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2" data-testid="text-waiting-title">Days of Waiting</h4>
                    <p className="text-slate-600" data-testid="text-waiting-description">Background checks and verification processes take 3-7 business days to complete.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <DollarSign className="text-red-600 h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2" data-testid="text-expensive-title">Expensive for Businesses</h4>
                    <p className="text-slate-600" data-testid="text-expensive-description">$50-200 per background check adds up fast for landlords and employers.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              {/* Problem Visualization */}
              <Card data-testid="card-problem-demo">
                <CardContent className="p-6">
                  <div className="text-center mb-6">
                    <h4 className="font-semibold text-slate-900 mb-2" data-testid="text-apartment-app-title">Typical Apartment Application</h4>
                    <div className="text-sm text-slate-600" data-testid="text-required-every-time">Required every single time</div>
                  </div>
                  <div className="space-y-4">
                    {[
                      "Driver's License",
                      "Proof of Income", 
                      "Bank Statements",
                      "References",
                      "Background Check"
                    ].map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg" data-testid={`requirement-${index}`}>
                        <span className="text-sm text-slate-900">{item}</span>
                        {index === 4 ? (
                          <div className="text-xs text-red-600">$75 fee</div>
                        ) : (
                          <svg className="text-red-600 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                          </svg>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 p-3 bg-red-100 rounded-lg text-center" data-testid="wait-time">
                    <div className="text-lg font-semibold text-red-600">5-7 Days Wait</div>
                    <div className="text-sm text-slate-600">For approval decision</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Solution */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              {/* Solution Visualization */}
              <Card data-testid="card-solution-demo">
                <CardContent className="p-6">
                  <div className="text-center mb-6">
                    <h4 className="font-semibold text-slate-900 mb-2" data-testid="text-with-chittyid">With ChittyID</h4>
                    <div className="text-sm text-blue-600" data-testid="text-verify-once">Verify once, use everywhere</div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg" data-testid="solution-share">
                      <span className="text-sm text-slate-900">Share ChittyID</span>
                      <CheckCircle className="text-blue-600 h-4 w-4" />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg" data-testid="solution-instant">
                      <span className="text-sm text-slate-900">Instant Verification</span>
                      <svg className="text-orange-600 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M13,9H11V7H13M13,17H11V11H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
                      </svg>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg" data-testid="solution-score">
                      <span className="text-sm text-slate-900">Trust Score: 847</span>
                      <Star className="text-yellow-600 h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-6 p-3 bg-blue-100 rounded-lg text-center" data-testid="instant-approval">
                    <div className="text-lg font-semibold text-blue-600">Instant Approval</div>
                    <div className="text-sm text-slate-600">No waiting, no paperwork</div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="order-1 lg:order-2">
              <h3 className="text-2xl font-bold text-slate-900 mb-6" data-testid="text-solution-title">The ChittyID Solution</h3>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckCircle className="text-blue-600 h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2" data-testid="text-verify-once-title">Verify Once, Use Everywhere</h4>
                    <p className="text-slate-600" data-testid="text-verify-once-desc">Complete verification process once and instantly access any business in our network.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="text-orange-600 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M13,9H11V7H13M13,17H11V11H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2" data-testid="text-instant-approval-title">Instant Approval</h4>
                    <p className="text-slate-600" data-testid="text-instant-approval-desc">Get approved for apartments, loans, and accounts in minutes instead of days.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <Shield className="text-red-600 h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2" data-testid="text-security-title">Bank-Grade Security</h4>
                    <p className="text-slate-600" data-testid="text-security-desc">Your data is encrypted and stored securely with blockchain-verified audit trails.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4" data-testid="text-how-works-title">How ChittyID Works For You</h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto" data-testid="text-how-works-desc">
              Whether you're an individual or business, ChittyID streamlines identity verification across all your interactions.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 mb-20">
            {/* For Individuals */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8" data-testid="card-for-individuals">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                  <Users className="text-white h-6 w-6" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900" data-testid="text-for-individuals">For Individuals</h3>
              </div>
              <div className="space-y-6">
                <Card data-testid="card-apartment-hunting">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <Home className="text-blue-600 h-5 w-5" />
                      <h4 className="font-semibold text-slate-900">Apartment Hunting</h4>
                    </div>
                    <p className="text-slate-600 text-sm">Apply to multiple apartments with one click. Landlords see your verified status instantly.</p>
                  </CardContent>
                </Card>
                <Card data-testid="card-banking-finance">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <University className="text-blue-600 h-5 w-5" />
                      <h4 className="font-semibold text-slate-900">Banking & Finance</h4>
                    </div>
                    <p className="text-slate-600 text-sm">Open accounts, get loans, and access financial services without paperwork.</p>
                  </CardContent>
                </Card>
                <Card data-testid="card-employment">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <Briefcase className="text-blue-600 h-5 w-5" />
                      <h4 className="font-semibold text-slate-900">Employment</h4>
                    </div>
                    <p className="text-slate-600 text-sm">Skip background check delays. Employers trust your verified ChittyID status.</p>
                  </CardContent>
                </Card>
              </div>
              <Button className="w-full mt-6" onClick={() => window.location.href = '/api/login'} data-testid="button-get-chittyid">
                Get Your ChittyID
              </Button>
            </div>

            {/* For Businesses */}
            <div className="bg-gradient-to-br from-orange-50 to-blue-50 rounded-2xl p-8" data-testid="card-for-businesses">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center">
                  <Building className="text-white h-6 w-6" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900" data-testid="text-for-businesses">For Businesses</h3>
              </div>
              <div className="space-y-6">
                <Card data-testid="card-reduce-costs">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <DollarSign className="text-orange-600 h-5 w-5" />
                      <h4 className="font-semibold text-slate-900">Reduce Costs</h4>
                    </div>
                    <p className="text-slate-600 text-sm">Save $50-200 per verification. No more expensive background check services.</p>
                  </CardContent>
                </Card>
                <Card data-testid="card-instant-onboarding">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <svg className="text-orange-600 h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6M12,8A4,4 0 0,0 8,12A4,4 0 0,0 12,16A4,4 0 0,0 16,12A4,4 0 0,0 12,8Z"/>
                      </svg>
                      <h4 className="font-semibold text-slate-900">Instant Onboarding</h4>
                    </div>
                    <p className="text-slate-600 text-sm">Verify customers in seconds instead of days. Faster decisions, happier customers.</p>
                  </CardContent>
                </Card>
                <Card data-testid="card-fraud-prevention">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <Shield className="text-red-600 h-5 w-5" />
                      <h4 className="font-semibold text-slate-900">Fraud Prevention</h4>
                    </div>
                    <p className="text-slate-600 text-sm">Eliminate fake identities with blockchain-verified credentials.</p>
                  </CardContent>
                </Card>
              </div>
              <Button className="w-full mt-6 bg-orange-600 hover:bg-orange-700" onClick={() => window.location.href = '/api/login'} data-testid="button-join-network">
                Join the Network
              </Button>
            </div>
          </div>

          {/* Trust Network */}
          <div className="text-center mb-12">
            <h3 className="text-2xl font-bold text-slate-900 mb-4" data-testid="text-trusted-by">Trusted by Leading Businesses</h3>
            <p className="text-slate-600" data-testid="text-join-thousands">Join thousands of businesses already using ChittyID for instant verification</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 items-center opacity-60">
            {[
              { icon: Home, label: "Property Mgmt" },
              { icon: University, label: "Banks" },
              { icon: Briefcase, label: "Employers" },
              { icon: ShoppingCart, label: "E-commerce" },
              { icon: Car, label: "Auto Dealers" },
              { icon: GraduationCap, label: "Education" }
            ].map((item, index) => (
              <div key={index} className="text-center" data-testid={`industry-${index}`}>
                <div className="w-16 h-16 bg-slate-200 rounded-lg mx-auto mb-2 flex items-center justify-center">
                  <item.icon className="text-slate-500 h-6 w-6" />
                </div>
                <div className="text-sm text-slate-600">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Authentication Section */}
      <section id="auth" className="py-20 bg-gradient-to-br from-blue-50 to-slate-100">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8 mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6" data-testid="text-auth-title">
            Get Your Universal ChittyID
          </h2>
          <p className="text-xl text-slate-600 mb-8" data-testid="text-auth-description">
            Join the ChittyOS ecosystem with your secure, verified digital identity
          </p>
        </div>
        <div className="max-w-md mx-auto">
          <ChittyAuth />
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6" data-testid="text-cta-title">
            Ready to Stop Proving Your Identity Over and Over?
          </h2>
          <p className="text-xl text-blue-100 mb-8" data-testid="text-cta-description">
            Join thousands who've simplified their lives with ChittyID. Verify once, trusted everywhere.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              variant="secondary" 
              onClick={() => document.getElementById('auth')?.scrollIntoView({ behavior: 'smooth' })} 
              data-testid="button-get-verified-now"
            >
              <CheckCircle className="mr-2 h-5 w-5" />
              Get Verified Now
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-blue-200 text-white hover:bg-blue-700" 
              onClick={() => document.getElementById('auth')?.scrollIntoView({ behavior: 'smooth' })}
              data-testid="button-add-business"
            >
              <Building className="mr-2 h-5 w-5" />
              Add My Business
            </Button>
          </div>
          <div className="mt-8 text-blue-100 text-sm" data-testid="text-cta-features">
            Free verification • Instant access • Bank-grade security
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Shield className="text-white h-4 w-4" />
                </div>
                <span className="text-xl font-bold" data-testid="text-footer-logo">ChittyID</span>
              </div>
              <p className="text-slate-400 mb-4" data-testid="text-footer-description">
                One verified identity that works everywhere. Simplifying identity verification for individuals and businesses.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-slate-400 hover:text-white transition-colors" data-testid="link-twitter">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                </a>
                <a href="#" className="text-slate-400 hover:text-white transition-colors" data-testid="link-linkedin">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
                <a href="#" className="text-slate-400 hover:text-white transition-colors" data-testid="link-github">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                </a>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4" data-testid="text-product-title">Product</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors" data-testid="link-for-individuals">For Individuals</a></li>
                <li><a href="#" className="hover:text-white transition-colors" data-testid="link-for-businesses">For Businesses</a></li>
                <li><a href="#" className="hover:text-white transition-colors" data-testid="link-api-docs">API Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors" data-testid="link-pricing">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4" data-testid="text-company-title">Company</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors" data-testid="link-about">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors" data-testid="link-security">Security</a></li>
                <li><a href="#" className="hover:text-white transition-colors" data-testid="link-privacy">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition-colors" data-testid="link-careers">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4" data-testid="text-support-title">Support</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors" data-testid="link-help">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors" data-testid="link-contact">Contact Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors" data-testid="link-status">Status</a></li>
                <li><a href="#" className="hover:text-white transition-colors" data-testid="link-blog">Blog</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-700 pt-8 flex flex-col md:flex-row justify-between items-center">
            <div className="text-slate-400 text-sm" data-testid="text-copyright">
              © 2024 ChittyID. All rights reserved.
            </div>
            <div className="flex space-x-6 text-slate-400 text-sm mt-4 md:mt-0">
              <a href="#" className="hover:text-white transition-colors" data-testid="link-terms">Terms</a>
              <a href="#" className="hover:text-white transition-colors" data-testid="link-privacy-footer">Privacy</a>
              <a href="#" className="hover:text-white transition-colors" data-testid="link-cookies">Cookies</a>
            </div>
          </div>
        </div>
      </footer>

      {/* ChittyAuth Section */}
      <section id="auth" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <ChittyAuth />
        </div>
      </section>
    </div>
  );
}
