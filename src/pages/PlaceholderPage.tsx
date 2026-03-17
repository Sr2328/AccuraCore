import { useLocation } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

const PlaceholderPage = () => {
  const { pathname } = useLocation();
  const pageName = pathname.split("/").filter(Boolean).pop() || "Page";
  const title = pageName.charAt(0).toUpperCase() + pageName.slice(1).replace(/([A-Z])/g, " $1");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Construction className="w-7 h-7 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Coming Soon</h2>
          <p className="text-sm text-muted-foreground mt-1">
            This module is under development and will be available shortly.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlaceholderPage;
