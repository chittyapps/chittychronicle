import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronRight,
  Database,
  Shield,
  Award,
  Link2,
  Copy,
  RotateCcw,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { EvidenceDistribution, OutboundMessage, Case } from '@shared/schema';

export default function EvidenceOrchestrator() {
  const [selectedCase, setSelectedCase] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [targetFilter, setTargetFilter] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // Fetch cases for filter
  const { data: cases = [] } = useQuery<Case[]>({
    queryKey: ['/api/cases'],
    refetchInterval: 30000,
  });

  // Build query parameters for API
  const buildQueryParams = () => {
    const params = new URLSearchParams();
    if (selectedCase !== 'all') params.append('caseId', selectedCase);
    if (statusFilter !== 'all') params.append('status', statusFilter);
    if (targetFilter.length > 0) params.append('target', targetFilter.join(','));
    return params.toString();
  };

  // Fetch distributions with filters and auto-refresh
  const { data: distributions = [], isLoading, refetch } = useQuery<EvidenceDistribution[]>({
    queryKey: ['/api/evidence/distributions', selectedCase, statusFilter, targetFilter.join(',')],
    queryFn: async () => {
      const queryString = buildQueryParams();
      const url = `/api/evidence/distributions${queryString ? `?${queryString}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch distributions');
      return response.json();
    },
    refetchInterval: 15000, // Poll every 15 seconds
  });

  // Fetch outbound messages for expanded rows
  const { data: outboundMessages = [] } = useQuery<OutboundMessage[]>({
    queryKey: ['/api/evidence/outbound-messages', ...expandedRows.sort()],
    enabled: expandedRows.length > 0,
    refetchInterval: expandedRows.length > 0 ? 15000 : false,
  });

  const targetSystems = [
    { id: 'chitty_ledger', name: 'ChittyLedger', icon: Database, color: 'bg-blue-500' },
    { id: 'chitty_verify', name: 'ChittyVerify', icon: Shield, color: 'bg-green-500' },
    { id: 'chitty_trust', name: 'ChittyTrust', icon: Award, color: 'bg-purple-500' },
    { id: 'chitty_chain', name: 'ChittyChain', icon: Link2, color: 'bg-orange-500' },
  ];

  const getStatusBadge = (status: string) => {
    const configs = {
      pending: { icon: Clock, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300', label: 'Pending' },
      dispatching: { icon: Loader2, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300', label: 'Dispatching', animated: true },
      dispatched: { icon: CheckCircle2, color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300', label: 'Delivered' },
      failed: { icon: AlertCircle, color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300', label: 'Failed' },
    };
    const config = configs[status as keyof typeof configs] || configs.pending;
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.color} flex items-center gap-1 text-xs font-medium uppercase tracking-wider`} data-testid={`badge-status-${status}`}>
        <Icon className={`h-3 w-3 ${config.animated ? 'animate-spin' : ''}`} />
        {config.label}
      </Badge>
    );
  };

  const getTargetIcon = (targetId: string) => {
    const target = targetSystems.find(t => t.id === targetId);
    if (!target) return null;
    const Icon = target.icon;
    return (
      <div className={`${target.color} p-1.5 rounded text-white`} title={target.name}>
        <Icon className="h-4 w-4" />
      </div>
    );
  };

  const toggleRow = (id: string) => {
    setExpandedRows(prev => 
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };

  const toggleTarget = (targetId: string) => {
    setTargetFilter(prev => {
      const index = prev.indexOf(targetId);
      if (index > -1) {
        return prev.filter(t => t !== targetId);
      }
      return [...prev, targetId];
    });
  };

  const toggleItem = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const truncateHash = (hash: string | null) => {
    if (!hash) return 'N/A';
    if (hash.length <= 16) return hash;
    return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`;
  };

  // Calculate statistics
  const stats = {
    total: distributions.length,
    successRate: distributions.length > 0
      ? ((distributions.filter(d => d.status === 'dispatched').length / distributions.length) * 100).toFixed(1)
      : '0',
    failed: distributions.filter(d => d.status === 'failed').length,
    pending: distributions.filter(d => d.status === 'pending').length,
  };

  // Filter distributions locally for MVP (backend search support to be added)
  const filteredDistributions = distributions.filter(dist => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      dist.envelopeId.toLowerCase().includes(query) ||
      dist.payloadHash?.toLowerCase().includes(query) ||
      dist.externalId?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100" data-testid="page-title">
                Evidence Orchestrator Dashboard
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Monitor evidence distribution across Chitty ecosystem
              </p>
            </div>
            <Button
              onClick={() => refetch()}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              data-testid="button-refresh"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 bg-white dark:bg-gray-800" data-testid="card-stat-total">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Envelopes</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{stats.total}</div>
            </Card>
            <Card className="p-4 bg-white dark:bg-gray-800" data-testid="card-stat-success">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Success Rate</div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{stats.successRate}%</div>
            </Card>
            <Card className="p-4 bg-white dark:bg-gray-800" data-testid="card-stat-failed">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Failed Items</div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{stats.failed}</div>
            </Card>
            <Card className="p-4 bg-white dark:bg-gray-800" data-testid="card-stat-pending">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending</div>
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">{stats.pending}</div>
            </Card>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-6 mb-6 bg-white dark:bg-gray-800">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Case Filter */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Case
              </label>
              <Select value={selectedCase} onValueChange={setSelectedCase}>
                <SelectTrigger data-testid="select-case">
                  <SelectValue placeholder="All Cases" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cases</SelectItem>
                  {cases.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Status
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-status">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="dispatching">Dispatching</SelectItem>
                  <SelectItem value="dispatched">Delivered</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Target Systems */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Target Systems
              </label>
              <div className="flex flex-wrap gap-2">
                {targetSystems.map(target => (
                  <label key={target.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={targetFilter.includes(target.id)}
                      onCheckedChange={() => toggleTarget(target.id)}
                      data-testid={`checkbox-target-${target.id}`}
                    />
                    <span className="text-gray-700 dark:text-gray-300">{target.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Search - client-side filtering on ID/hash */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Search IDs/Hashes
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search envelope/hash..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Distributions Table */}
        <Card className="bg-white dark:bg-gray-800 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-gray-900">
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedItems.length === filteredDistributions.length && filteredDistributions.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedItems(filteredDistributions.map(d => d.id));
                      } else {
                        setSelectedItems([]);
                      }
                    }}
                    data-testid="checkbox-select-all"
                  />
                </TableHead>
                <TableHead className="w-12"></TableHead>
                <TableHead className="text-sm font-medium uppercase tracking-wide">Envelope ID</TableHead>
                <TableHead className="text-sm font-medium uppercase tracking-wide">Target</TableHead>
                <TableHead className="text-sm font-medium uppercase tracking-wide">Status</TableHead>
                <TableHead className="text-sm font-medium uppercase tracking-wide">Created</TableHead>
                <TableHead className="text-sm font-medium uppercase tracking-wide">Dispatched</TableHead>
                <TableHead className="text-sm font-medium uppercase tracking-wide text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                    <p className="text-sm text-gray-500 mt-2">Loading distributions...</p>
                  </TableCell>
                </TableRow>
              ) : filteredDistributions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <Database className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600" />
                    <p className="text-gray-500 dark:text-gray-400 mt-2">No distributions found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredDistributions.map((dist) => (
                  <>
                    <TableRow
                      key={dist.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      data-testid={`row-distribution-${dist.id}`}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedItems.includes(dist.id)}
                          onCheckedChange={() => toggleItem(dist.id)}
                          data-testid={`checkbox-item-${dist.id}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRow(dist.id)}
                          data-testid={`button-expand-${dist.id}`}
                        >
                          {expandedRows.includes(dist.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          {truncateHash(dist.envelopeId)}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTargetIcon(dist.target)}
                          <span className="text-sm">{targetSystems.find(t => t.id === dist.target)?.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(dist.status)}</TableCell>
                      <TableCell className="text-xs text-gray-600 dark:text-gray-400">
                        {dist.createdAt ? formatDistanceToNow(new Date(dist.createdAt), { addSuffix: true }) : 'N/A'}
                      </TableCell>
                      <TableCell className="text-xs text-gray-600 dark:text-gray-400">
                        {dist.dispatchedAt ? formatDistanceToNow(new Date(dist.dispatchedAt), { addSuffix: true }) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {dist.status === 'failed' && (
                            <Button variant="ghost" size="sm" data-testid={`button-retry-${dist.id}`}>
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(dist.envelopeId)}
                            data-testid={`button-copy-${dist.id}`}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedRows.includes(dist.id) && (
                      <TableRow>
                        <TableCell colSpan={8} className="bg-gray-50 dark:bg-gray-900 p-6">
                          <div className="space-y-4">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              Distribution Details
                            </h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Payload Hash:</span>
                                <code className="ml-2 font-mono text-xs">{dist.payloadHash}</code>
                              </div>
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">External ID:</span>
                                <code className="ml-2 font-mono text-xs">{dist.externalId || 'N/A'}</code>
                              </div>
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Retry Count:</span>
                                <span className="ml-2">{dist.retryCount || '0'}</span>
                              </div>
                              {dist.errorLog && (
                                <div className="col-span-2">
                                  <span className="text-gray-600 dark:text-gray-400">Error Log:</span>
                                  <pre className="mt-1 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                                    {dist.errorLog}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Batch Action Bar */}
        {selectedItems.length > 0 && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 dark:bg-gray-800 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-4 z-50">
            <span className="text-sm font-medium">{selectedItems.length} items selected</span>
            <Button variant="secondary" size="sm" data-testid="button-batch-retry">
              <RotateCcw className="h-4 w-4 mr-2" />
              Retry Selected
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedItems([])}
              data-testid="button-clear-selection"
            >
              Clear Selection
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
