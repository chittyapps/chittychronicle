import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building, Users, TrendingUp, Shield, Plus } from "lucide-react";

export function BusinessStats() {
  const { data: businesses, isLoading } = useQuery({
    queryKey: ['/api/businesses'],
  });

  if (isLoading) {
    return (
      <div className="grid md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} data-testid={`loading-card-${i}`}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                <div className="h-6 bg-slate-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const businessesArray = Array.isArray(businesses) ? businesses : [];
  const totalBusinesses = businessesArray.length;
  const industryBreakdown = businessesArray.reduce((acc: Record<string, number>, business: any) => {
    const industry = business.industry || 'Other';
    acc[industry] = (acc[industry] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid md:grid-cols-4 gap-6">
        <Card data-testid="card-total-businesses">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Building className="h-8 w-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold text-slate-900" data-testid="text-total-businesses">{totalBusinesses}</div>
                <div className="text-sm text-slate-600">Total Businesses</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-network-growth">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold text-slate-900">+24%</div>
                <div className="text-sm text-slate-600">Network Growth</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-verified-users">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-purple-600" />
              <div>
                <div className="text-2xl font-bold text-slate-900">10,247</div>
                <div className="text-sm text-slate-600">Verified Users</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-trust-level">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-orange-600" />
              <div>
                <div className="text-2xl font-bold text-slate-900">99.8%</div>
                <div className="text-sm text-slate-600">Trust Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Business Directory */}
      <Card data-testid="card-business-directory">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Business Network Directory</CardTitle>
            <Button size="sm" data-testid="button-add-business">
              <Plus className="h-4 w-4 mr-2" />
              Add Your Business
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {businessesArray.length > 0 ? (
              businessesArray.map((business: any, index: number) => (
                <div key={business.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg" data-testid={`business-${index}`}>
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                      <Building className="h-6 w-6 text-slate-600" />
                    </div>
                    <div>
                      <div className="font-medium text-slate-900" data-testid={`business-name-${index}`}>{business.name}</div>
                      <div className="text-sm text-slate-600" data-testid={`business-industry-${index}`}>{business.industry || 'General'}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-sm text-slate-600">Min Trust Score</div>
                      <div className="font-medium" data-testid={`business-threshold-${index}`}>{business.trustThreshold}</div>
                    </div>
                    <Badge variant="outline" data-testid={`business-status-${index}`}>Active</Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-500" data-testid="no-businesses">
                <Building className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <div>No businesses in the network yet</div>
                <div className="text-sm">Be the first to join!</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Industry Breakdown */}
      {Object.keys(industryBreakdown).length > 0 && (
        <Card data-testid="card-industry-breakdown">
          <CardHeader>
            <CardTitle>Industry Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              {Object.entries(industryBreakdown).map(([industry, count], index) => (
                <div key={industry} className="text-center p-4 border border-slate-200 rounded-lg" data-testid={`industry-${index}`}>
                  <div className="text-2xl font-bold text-slate-900" data-testid={`industry-count-${index}`}>{String(count)}</div>
                  <div className="text-sm text-slate-600" data-testid={`industry-name-${index}`}>{industry}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Benefits Section */}
      <Card data-testid="card-business-benefits">
        <CardHeader>
          <CardTitle>Benefits of Joining the ChittyID Network</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-slate-900 mb-2">For Businesses</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>• Instant customer verification</li>
                <li>• Reduce fraud by 95%</li>
                <li>• Save $50-200 per background check</li>
                <li>• Faster customer onboarding</li>
                <li>• Access to verified customer base</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-2">For Customers</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>• One-time verification process</li>
                <li>• Instant service approvals</li>
                <li>• No repeated document uploads</li>
                <li>• Enhanced trust and reputation</li>
                <li>• Premium customer treatment</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
