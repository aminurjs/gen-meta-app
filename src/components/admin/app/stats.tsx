"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getBaseApi } from "@/services/image-services";
import { getAccessToken } from "@/services/auth-services";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CreditCard,
  DollarSign,
  Key,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface User {
  _id: string;
  name: string;
  email: string;
}

interface Payment {
  _id: string;
  userId: User;
  amount: number;
  createdAt: string;
}

interface DashboardStats {
  revenue: {
    total: number;
    currentMonth: number;
    lastMonth: number;
    growthPercentage: number | null;
    monthlyRevenueList: Record<string, number>;
  };
  apiKeys: {
    total: number;
    active: number;
    activePremium: number;
    monthlyProcessList: Record<string, number>;
  };
  payments: {
    total: number;
    newThisMonth: number;
    recent: Payment[];
  };
}

export default function DashboardStats() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const baseApi = await getBaseApi();
      const accessToken = await getAccessToken();

      const response = await fetch(`${baseApi}/app/getDashboardStats/get`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch dashboard statistics");
      }

      const result = await response.json();

      if (result.success) {
        setStats(result.data);
      } else {
        throw new Error(
          result.message || "Failed to fetch dashboard statistics"
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MMM d, yyyy");
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), "h:mm a");
  };

  const formatMonthYear = (monthYear: string) => {
    const [year, month] = monthYear.split("-");
    return format(
      new Date(Number.parseInt(year), Number.parseInt(month) - 1),
      "MMM yyyy"
    );
  };

  const prepareChartData = (monthlyData: Record<string, number>) => {
    return Object.entries(monthlyData).map(([month, value]) => ({
      month: formatMonthYear(month),
      value,
    }));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading dashboard statistics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <XCircle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-lg font-medium">
          Error loading dashboard statistics
        </h3>
        <p className="text-muted-foreground mt-2 mb-4">{error}</p>
        <Button onClick={fetchDashboardStats}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <XCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No data available</h3>
        <p className="text-muted-foreground mt-2 mb-4">
          Dashboard statistics could not be loaded.
        </p>
        <Button onClick={fetchDashboardStats}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>
    );
  }

  const revenueData = prepareChartData(stats.revenue.monthlyRevenueList);
  const processData = prepareChartData(stats.apiKeys.monthlyProcessList);
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Button variant="outline" onClick={fetchDashboardStats}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-3 md:grid-cols-5">
        {/* Total Revenue Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.revenue.total)}
            </div>
            <p className="text-xs text-muted-foreground">Lifetime revenue</p>
          </CardContent>
        </Card>

        {/* Monthly Revenue Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Current Month Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.revenue.currentMonth)}
            </div>
            <div className="flex items-center pt-1">
              {stats.revenue.growthPercentage !== null && (
                <>
                  {stats.revenue.growthPercentage > 0 ? (
                    <ArrowUpIcon className="mr-1 h-3 w-3 text-green-500" />
                  ) : (
                    <ArrowDownIcon className="mr-1 h-3 w-3 text-red-500" />
                  )}
                  <span
                    className={
                      stats.revenue.growthPercentage > 0
                        ? "text-xs text-green-500"
                        : "text-xs text-red-500"
                    }
                  >
                    {Math.abs(stats.revenue.growthPercentage)}% from last month
                  </span>
                </>
              )}
              {stats.revenue.growthPercentage === null && (
                <span className="text-xs text-muted-foreground">
                  No previous data
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Last Month Revenue*/}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Previous Month
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.revenue.lastMonth)}
            </div>
            <p className="text-xs text-muted-foreground">
              Last month&apos;s revenue
            </p>
          </CardContent>
        </Card>
        {/* App Users Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">App Users</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.apiKeys.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.apiKeys.active} active ({stats.apiKeys.activePremium}{" "}
              premium)
            </p>
          </CardContent>
        </Card>

        {/* Payments Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payments</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.payments.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.payments.newThisMonth} new this month
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
            <CardDescription>Monthly revenue trends</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={revenueData}
                margin={{
                  top: 10,
                  right: 30,
                  left: 0,
                  bottom: 0,
                }}
              >
                <XAxis
                  dataKey="month"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value}`}
                />
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                Month
                              </span>
                              <span className="font-bold text-sm">
                                {payload[0].payload.month}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                Revenue
                              </span>
                              <span className="font-bold text-sm">
                                {formatCurrency(payload[0].value as number)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Images process Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Images process Overview</CardTitle>
            <CardDescription>Monthly Images process trends</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={processData}
                margin={{
                  top: 10,
                  right: 30,
                  left: 0,
                  bottom: 0,
                }}
              >
                <XAxis
                  dataKey="month"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                Month
                              </span>
                              <span className="font-bold text-sm">
                                {payload[0].payload.month}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                Processes
                              </span>
                              <span className="font-bold text-sm">
                                {payload[0].value}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#82ca9d"
                  fill="#82ca9d"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Payments */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Payments</CardTitle>
          <CardDescription>Latest payment transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.payments.recent.map((payment) => (
                <TableRow key={payment._id}>
                  <TableCell>
                    <div className="flex gap-4">
                      {" "}
                      <Avatar className="h-9 w-9">
                        <AvatarImage
                          src={`https://avatar.vercel.sh/${payment.userId.email}`}
                          alt={payment.userId.name}
                        />
                        <AvatarFallback>
                          {getInitials(payment.userId.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {payment.userId.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {payment.userId.email}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(payment.amount)}
                  </TableCell>
                  <TableCell>{formatDate(payment.createdAt)}</TableCell>
                  <TableCell>{formatTime(payment.createdAt)}</TableCell>
                </TableRow>
              ))}
              {stats.payments.recent.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center py-6 text-muted-foreground"
                  >
                    No recent payments
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
