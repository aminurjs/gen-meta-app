"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiResponse } from "@/app/(main)/dashboard/page";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { Badge } from "../ui/badge";

const calculateRenewalDate = (futureDate: string): string => {
  if (!futureDate) return "No active plan";

  try {
    const today = new Date();
    const targetDate = new Date(futureDate);

    // Check if the date is valid
    if (isNaN(targetDate.getTime())) {
      return "Invalid date";
    }

    const diffInMilliseconds = targetDate.getTime() - today.getTime();
    const diffInDays = Math.ceil(diffInMilliseconds / (1000 * 60 * 60 * 24));

    if (diffInDays < 0) return "Plan expired";
    if (diffInDays === 0) return "Renews today";
    if (diffInDays === 1) return "Renews tomorrow";
    return `Renews in ${diffInDays} days`;
  } catch (error) {
    console.error("Error calculating renewal date:", error);
    return "Date calculation error";
  }
};

interface DataProps {
  data: ApiResponse["data"];

  handlePurchase: (packageId: string) => Promise<void>;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export default function OverviewTab({
  data,
  handlePurchase,
  isLoading = false,
  onRefresh,
}: DataProps) {
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("bkash");

  // Calculate usage percentage safely
  const calculateUsagePercentage = () => {
    const used = data.userActivity?.totalTokensUsed || 0;
    const purchased = data.userActivity?.totalTokensPurchased || 1; // Prevent division by zero
    const percentage = (used * 100) / purchased;
    return Math.min(percentage, 100); // Cap at 100%
  };

  // Handle purchase button click
  const handlePurchaseClick = () => {
    if (!selectedPackageId) {
      // If no package is selected, use the first package in the list
      const firstPackage = data.packages[0];
      if (firstPackage) {
        handlePurchase(firstPackage._id);
      }
    } else {
      handlePurchase(selectedPackageId);
    }
  };
  const tokenHistory = data.userActivity?.tokenHistory || [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Token Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.userActivity?.availableTokens || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.userActivity?.tokensUsedThisMonth
                ? `+ ${data.userActivity.tokensUsedThisMonth} used this month`
                : "No tokens used this month"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Images Processed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.userActivity?.totalImageProcessed || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {calculateUsagePercentage().toFixed(1)}%
            </div>
            <Progress value={calculateUsagePercentage()} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.userActivity?.plan?.planId?.title || "No Plan"}
            </div>
            <p className="text-xs text-muted-foreground">
              {calculateRenewalDate(data.userActivity?.plan?.expiresDate || "")}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Your recent image processing jobs
              </CardDescription>
            </div>
            {onRefresh && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onRefresh}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                  >
                    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                    <path d="M21 3v5h-5" />
                    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                    <path d="M3 21v-5h5" />
                  </svg>
                )}
                <span className="sr-only">Refresh</span>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {data.recentActivity.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch ID</TableHead>
                    <TableHead className="text-center">Date</TableHead>
                    <TableHead className="text-center">Tokens</TableHead>
                    <TableHead className="text-center">Images</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentActivity.map((item) => (
                    <TableRow key={item._id}>
                      <TableCell className="font-mono text-xs">
                        {item.batchId
                          ? item.batchId.substring(
                              Math.max(0, item.batchId.length - 12),
                              item.batchId.length
                            )
                          : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        {formatDate(item.createdAt)}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.imagesCount ?? "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.imagesCount ?? "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-6 text-center text-muted-foreground">
                No recent activity found
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={() => {
                toast("Coming soon...");
              }}
            >
              View All
            </Button>
          </CardFooter>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Quick Purchase</CardTitle>
            <CardDescription>Buy more tokens for your account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token-package">Token Package</Label>
              {data.packages.length > 0 ? (
                <Select
                  value={selectedPackageId}
                  onValueChange={setSelectedPackageId}
                >
                  <SelectTrigger id="token-package">
                    <SelectValue placeholder="Select token package" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.packages.map((pkg) => (
                      <SelectItem key={pkg._id} value={pkg._id}>
                        {pkg.tokens} Tokens - ৳{pkg.price}
                        {pkg.popular && " (Popular)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Skeleton className="h-10 w-full" />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-method">Payment Method</Label>
              <Select
                value={paymentMethod}
                onValueChange={setPaymentMethod}
                disabled={data.packages.length === 0}
              >
                <SelectTrigger id="payment-method">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bkash">BKash</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              onClick={handlePurchaseClick}
              disabled={isLoading || data.packages.length === 0}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Purchase Tokens"
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Token History</CardTitle>
            <CardDescription>
              Your token purchase and usage history
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              {tokenHistory.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tokenHistory.map((transaction) => {
                      const isAddition =
                        transaction.actionType === "purchase" ||
                        transaction.actionType === "assigned" ||
                        transaction.actionType === "refund";

                      return (
                        <TableRow key={transaction._id}>
                          <TableCell>
                            {formatDate(transaction.createdAt || "")}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                isAddition
                                  ? "bg-green-50 text-green-700 hover:bg-green-50 hover:text-green-700"
                                  : "bg-red-50 text-red-700 hover:bg-red-50 hover:text-red-700"
                              }
                            >
                              {transaction.actionType?.charAt(0).toUpperCase() +
                                transaction.actionType?.slice(1) || "Unknown"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {transaction.description || "No description"}
                          </TableCell>
                          <TableCell
                            className={`text-right ${
                              isAddition ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {isAddition ? "+" : "-"}
                            {transaction.tokenDetails?.count || 0}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <p>No token history available</p>
                </div>
              )}
            </div>
          </CardContent>
          {tokenHistory.length > 5 && (
            <CardFooter>
              <Button variant="outline" size="sm" className="ml-auto">
                View All Transactions
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}
