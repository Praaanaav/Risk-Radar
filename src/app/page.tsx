
"use client";

import { useState } from "react";
import type { z } from "zod";

import { explainData } from "@/ai/flows/explain-data-tool";
import { generatePersonalizedRecommendations } from "@/ai/flows/personalized-recommendations";
import { PatientForm, PatientFormSchema } from "@/components/patient-form";
import { RiskAssessment } from "@/components/risk-assessment";
import { RiskAssessmentSkeleton } from "@/components/risk-assessment-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { Activity, Bot, Hospital, Info } from "lucide-react";

type Assessment = {
  explanation: string;
  riskLevel: "High" | "Low";
  recommendations: string;
  futureRisks: string;
  emergencyPlan?: string;
};

// A simple retry utility to handle transient errors
async function retry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  let lastError: Error | undefined;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < retries - 1) {
        // Using exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }
  throw lastError;
}


export default function Home() {
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handlePredict = async (data: z.infer<typeof PatientFormSchema>) => {
    setIsLoading(true);
    setAssessment(null);

    try {
      // 1. Get data explanation with retry
      const explanationResult = await retry(() => explainData(data));
      if (!explanationResult.explanation) {
        throw new Error("Could not generate data explanation.");
      }

      // 2. Predict risk level (simulated)
      const { age, priorInpatientVisits, diagnosis, currentCondition } = data;
      let riskScore = 0;
      const lowercasedDiagnosis = diagnosis.toLowerCase();
      const lowercasedCondition = currentCondition.toLowerCase();

      if (priorInpatientVisits > 10) {
        riskScore += 3;
      } else if (priorInpatientVisits > 2) {
        riskScore += 2;
      } else if (priorInpatientVisits > 0) {
        riskScore++;
      }

      if (age > 75) {
        riskScore += 2;
      } else if (age > 60) {
        riskScore++;
      }

      const criticalDiagnosisTerms = ["heart failure", "copd", "diabetes", "unconsciousness", "stroke", "cancer", "sepsis", "cardiac arrest"];
      for (const term of criticalDiagnosisTerms) {
        if (lowercasedDiagnosis.includes(term)) {
          riskScore += 3;
        }
      }

      const criticalConditionTerms = ["not breathing", "no pulse", "unresponsive", "not beating", "bleeding", "amputation", "snake bite"];
      let isEmergency = false;
      for (const term of criticalConditionTerms) {
        if (lowercasedCondition.includes(term) || lowercasedDiagnosis.includes(term)) {
          riskScore += 5; // High score for immediate critical conditions
          isEmergency = true;
        }
      }

      const riskLevel: "High" | "Low" = riskScore >= 4 ? "High" : "Low";


      // 3. Get personalized recommendations with retry
      const recommendationsResult = await retry(() => generatePersonalizedRecommendations({
        patientDataSummary: explanationResult.explanation,
        riskLevel,
        isEmergency,
      }));
      if (!recommendationsResult.recommendations || !recommendationsResult.futureRisks) {
        throw new Error("Could not generate recommendations.");
      }

      setAssessment({
        explanation: explanationResult.explanation,
        riskLevel,
        recommendations: recommendationsResult.recommendations,
        futureRisks: recommendationsResult.futureRisks,
        emergencyPlan: recommendationsResult.emergencyPlan,
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "An error occurred",
        description:
          "Failed to generate risk assessment. Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <Hospital className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold font-headline">Risk Radar</h1>
          </div>
        </div>
      </header>
      <main className="flex-grow container mx-auto p-4 md:p-6">
        <div className="mx-auto mb-8 max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl font-headline">
            Predict Patient Readmission Risk
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Enter patient details below to receive an AI-powered risk
            assessment and personalized recommendations to prevent hospital
            readmissions.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <PatientForm onPredict={handlePredict} isLoading={isLoading} />
          </div>
          <div className="lg:col-span-3">
            {isLoading ? (
              <RiskAssessmentSkeleton />
            ) : assessment ? (
              <RiskAssessment {...assessment} />
            ) : (
              <Card className="flex h-full min-h-[500px] flex-col items-center justify-center p-8 text-center shadow-inner border-dashed">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Hospital className="h-8 w-8 text-primary" />
                </div>
                <CardHeader>
                  <CardTitle className="text-2xl font-headline">
                    Awaiting Patient Data
                  </CardTitle>
                  <CardDescription className="mt-2">
                    Your assessment results will appear here once you submit the
                    patient's information.
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
          </div>
        </div>
      </main>
      <footer className="mt-16 border-t py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground md:px-6">
          <p>&copy; {new Date().getFullYear()} Risk Radar. All rights reserved.</p>
          <p className="mt-1">Powered by GenAI and Next.js</p>
        </div>
      </footer>
      <Toaster />
    </div>
  );
}
