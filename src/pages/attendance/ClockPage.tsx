import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Clock, MapPin, CheckCircle, XCircle, AlertTriangle, Loader2, Navigation } from "lucide-react";
import { format } from "date-fns";

const COMPANY_ID = 1;
const DEMO_EMPLOYEE_ID = 1; // In production this comes from the authenticated user's employee record

type GeoPosition = { lat: number; lng: number; accuracy: number };

export default function ClockPage() {
  const [notes, setNotes] = useState("");
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Get today's record for this employee
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { data: todayRecords, refetch: refetchRecords } = trpc.attendance.records.list.useQuery({
    companyId: COMPANY_ID,
    startDate: today,
    endDate: new Date(),
    employeeId: DEMO_EMPLOYEE_ID,
  });

  const todayRecord = todayRecords?.[0] as Record<string, unknown> | undefined;
  const isClockedIn = Boolean(todayRecord?.clockIn && !todayRecord?.clockOut);
  const isClockedOut = Boolean(todayRecord?.clockIn && todayRecord?.clockOut);

  const clockInMutation = trpc.attendance.clock.in.useMutation({
    onSuccess: () => {
      toast.success("Clocked in successfully");
      refetchRecords();
      setNotes("");
    },
    onError: (err) => toast.error(err.message),
  });

  const clockOutMutation = trpc.attendance.clock.out.useMutation({
    onSuccess: () => {
      toast.success("Clocked out successfully");
      refetchRecords();
      setNotes("");
    },
    onError: (err) => toast.error(err.message),
  });

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation not supported by your browser");
      return;
    }
    setGeoLoading(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setGeoLoading(false);
      },
      (err) => {
        setGeoError(err.message);
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }, []);

  useEffect(() => { getLocation(); }, [getLocation]);

  const handleClockIn = () => {
    clockInMutation.mutate({
      companyId: COMPANY_ID,
      employeeId: DEMO_EMPLOYEE_ID,
      lat: position ? String(position.lat) : undefined,
      lng: position ? String(position.lng) : undefined,
      notes: notes || undefined,
    });
  };

  const handleClockOut = () => {
    clockOutMutation.mutate({
      companyId: COMPANY_ID,
      employeeId: DEMO_EMPLOYEE_ID,
      lat: position ? String(position.lat) : undefined,
      lng: position ? String(position.lng) : undefined,
      notes: notes || undefined,
    });
  };

  const isLoading = clockInMutation.isPending || clockOutMutation.isPending;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Clock In / Out</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Record your attendance with geo-location verification
        </p>
      </div>

      {/* Live Clock */}
      <Card className="text-center">
        <CardContent className="py-8">
          <div className="text-6xl font-mono font-bold text-foreground tracking-tight">
            {format(currentTime, "HH:mm:ss")}
          </div>
          <div className="text-muted-foreground mt-2 text-sm">
            {format(currentTime, "EEEE, MMMM d, yyyy")}
          </div>
        </CardContent>
      </Card>

      {/* Today's Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Today's Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isClockedOut ? (
            <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 rounded-lg p-3">
              <CheckCircle className="h-5 w-5" />
              <div>
                <div className="font-medium text-sm">Shift Complete</div>
                <div className="text-xs text-emerald-600">
                  {format(new Date(String(todayRecord!.clockIn)), "HH:mm")} — {format(new Date(String(todayRecord!.clockOut)), "HH:mm")}
                  {todayRecord?.workMinutes ? ` · ${Math.floor(Number(todayRecord.workMinutes) / 60)}h ${Number(todayRecord.workMinutes) % 60}m` : ""}
                </div>
              </div>
            </div>
          ) : isClockedIn ? (
            <div className="flex items-center gap-2 text-blue-700 bg-blue-50 rounded-lg p-3">
              <Clock className="h-5 w-5 animate-pulse" />
              <div>
                <div className="font-medium text-sm">Currently Clocked In</div>
                <div className="text-xs text-blue-600">
                  Since {format(new Date(String(todayRecord!.clockIn)), "HH:mm")}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-600 bg-slate-50 rounded-lg p-3">
              <XCircle className="h-5 w-5" />
              <div className="font-medium text-sm">Not yet clocked in today</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Geo-location Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            Location
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {geoLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Detecting location...
            </div>
          ) : geoError ? (
            <div className="flex items-start gap-2 text-amber-700 bg-amber-50 rounded-lg p-3">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-sm font-medium">Location unavailable</div>
                <div className="text-xs mt-0.5">{geoError}</div>
                <div className="text-xs mt-1 text-amber-600">You can still clock in/out without location, but it will be flagged for review.</div>
              </div>
            </div>
          ) : position ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 text-sm">
                <Navigation className="h-4 w-4" />
                <span className="font-medium">Location captured</span>
                <Badge variant="outline" className="text-xs border-emerald-300 text-emerald-700">
                  ±{Math.round(position.accuracy)}m accuracy
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground font-mono">
                {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
              </div>
            </div>
          ) : null}

          <Button variant="outline" size="sm" onClick={getLocation} disabled={geoLoading}>
            <Navigation className="h-3.5 w-3.5 mr-1.5" />
            Refresh Location
          </Button>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Notes (optional)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Add any notes about your attendance today..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            className="text-sm"
          />
        </CardContent>
      </Card>

      {/* Action Button */}
      {!isClockedOut && (
        <Button
          className="w-full h-14 text-lg font-semibold"
          variant={isClockedIn ? "destructive" : "default"}
          onClick={isClockedIn ? handleClockOut : handleClockIn}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
          ) : isClockedIn ? (
            <XCircle className="h-5 w-5 mr-2" />
          ) : (
            <CheckCircle className="h-5 w-5 mr-2" />
          )}
          {isLoading ? "Processing..." : isClockedIn ? "Clock Out" : "Clock In"}
        </Button>
      )}

      {isClockedOut && (
        <div className="text-center text-sm text-muted-foreground">
          Your shift for today is complete. See you tomorrow!
        </div>
      )}
    </div>
  );
}
