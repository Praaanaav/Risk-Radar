
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, CheckCircle, HeartPulse, ShieldAlert, ShieldCheck, Star, XCircle } from "lucide-react";

type RiskAssessmentProps = {
  explanation: string;
  riskLevel: "High" | "Low";
  recommendations: string;
  futureRisks: string;
};

// A simple markdown to JSX component.
function Markdown({ content }: { content: string }) {
  const parts = content.split(/(\[DO\].*?|\[DON'T\].*?)(?=\n|\[DO\]|\[DON'T\]|$)/g);

  return (
    <div className="space-y-4">
      {parts.map((part, i) => {
        if (part.startsWith("[DO]")) {
          return (
            <div key={i} className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 shrink-0 text-green-500 mt-0.5" />
              <p className="text-muted-foreground">
                <span className="font-bold text-green-500">DO: </span>
                {part.slice(4).trim()}
              </p>
            </div>
          );
        }
        if (part.startsWith("[DON'T]")) {
          return (
            <div key={i} className="flex items-start gap-3">
              <XCircle className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
              <p className="text-muted-foreground">
                <span className="font-bold text-red-500">DON'T: </span>
                {part.slice(7).trim()}
              </p>
            </div>
          );
        }
        if (part.trim()) {
           return <p key={i} className="text-muted-foreground">{part.trim()}</p>;
        }
        return null;
      })}
    </div>
  );
}


export function RiskAssessment({
  explanation,
  riskLevel,
  recommendations,
  futureRisks
}: RiskAssessmentProps) {
  const riskLevelConfig = {
    High: {
      label: "High Risk",
      Icon: ShieldAlert,
      badgeVariant: "destructive" as const,
      textColor: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    Low: {
      label: "Low Risk",
      Icon: ShieldCheck,
      badgeVariant: "secondary" as const,
      textColor: "text-accent",
      bgColor: "bg-accent/10",
    },
  };

  const config = riskLevelConfig[riskLevel];

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-500">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-headline">
            <Bot className="h-5 w-5 text-primary" />
            <span>AI Data Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground whitespace-pre-wrap">{explanation}</p>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-headline">
            <config.Icon className={`h-5 w-5 ${config.textColor}`} />
            <span>Readmission Risk Assessment</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div
              className={`flex h-16 w-16 items-center justify-center rounded-full ${config.bgColor}`}
            >
              <config.Icon className={`h-8 w-8 ${config.textColor}`} />
            </div>
            <div>
              <Badge variant={config.badgeVariant} className="text-sm">
                {config.label}
              </Badge>
              <p className="mt-1 text-muted-foreground">
                The patient is at a {riskLevel.toLowerCase()} risk of
                readmission.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {futureRisks && (
        <Card className="shadow-lg bg-yellow-50 border-yellow-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline text-yellow-800">
              <Star className="h-5 w-5" />
              <span>Future Risk Outlook</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-yellow-700">{futureRisks}</p>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-headline">
            <HeartPulse className="h-5 w-5 text-accent" />
            <span>Personalized Recommendations</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Markdown content={recommendations} />
        </CardContent>
      </Card>
    </div>
  );
}
