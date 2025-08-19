import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Scale, Shield, FileText, Users, Calendar } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-blue-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Clock className="text-white h-6 w-6" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">ChittyTimeline</h1>
            </div>
            <Button 
              onClick={() => window.location.href = '/api/login'}
              className="bg-primary hover:bg-primary-dark text-white font-semibold px-6 py-2"
              data-testid="login-button"
            >
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Legal Timeline Management
            <span className="block text-primary mt-2">Made Simple</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Specialized timeline management for legal professionals. Track evidence, 
            manage deadlines, detect contradictions, and maintain the chain of custody 
            with our ADHD-friendly, attorney-client privilege protected system.
          </p>
          <Button 
            size="lg"
            onClick={() => window.location.href = '/api/login'}
            className="bg-primary hover:bg-primary-dark text-white font-semibold px-8 py-4 text-lg"
            data-testid="get-started-button"
          >
            Get Started Now
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <Card className="bg-white/70 backdrop-blur-sm border-blue-200 hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Scale className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle className="text-gray-900">Timeline Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Create chronological timelines with event and task distinction. 
                Track relationships between entries and maintain temporal accuracy.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/70 backdrop-blur-sm border-blue-200 hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="text-gray-900">Evidence Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Link timeline entries directly to source documents with page-level 
                citations and verification status tracking.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/70 backdrop-blur-sm border-blue-200 hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-gray-900">Legal Compliance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Attorney-client privilege protection, audit trail maintenance, 
                and comprehensive chain of custody documentation.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/70 backdrop-blur-sm border-blue-200 hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <CardTitle className="text-gray-900">ChittyPM Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Seamless integration with ChittyPM for comprehensive project 
                management while maintaining legal documentation standards.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/70 backdrop-blur-sm border-blue-200 hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                <Calendar className="h-6 w-6 text-yellow-600" />
              </div>
              <CardTitle className="text-gray-900">Deadline Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Automatic court deadline calculations, statute of limitations 
                monitoring, and service date management.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/70 backdrop-blur-sm border-blue-200 hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
              <CardTitle className="text-gray-900">ADHD-Friendly Design</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                High contrast colors, clear visual hierarchy, minimal distractions, 
                and consistent spacing for better focus and accessibility.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-white/70 backdrop-blur-sm rounded-2xl p-12 border border-blue-200">
          <h3 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Streamline Your Legal Timeline Management?
          </h3>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Join legal professionals who trust ChittyTimeline to manage their case 
            timelines, evidence correlation, and deadline tracking with precision and compliance.
          </p>
          <Button 
            size="lg"
            onClick={() => window.location.href = '/api/login'}
            className="bg-primary hover:bg-primary-dark text-white font-semibold px-8 py-4 text-lg"
            data-testid="start-free-trial-button"
          >
            Start Your Free Trial
          </Button>
        </div>
      </main>
    </div>
  );
}
