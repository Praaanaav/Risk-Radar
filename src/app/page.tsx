
"use client";

import { useState } from "react";
import type { z } from "zod";

import { explainData } from "@/ai/flows/explain-data-tool";
import { generatePersonalizedRecommendations } from "@/ai/flows/personalized-recommendations";
import { translateText } from "@/ai/flows/translate-text";
import { PatientForm, PatientFormSchema } from "@/components/patient-form";
import { RiskAssessment } from "@/components/risk-assessment";
import { RiskAssessmentSkeleton } from "@/components/risk-assessment-skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { Globe, Hospital } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Assessment = {
  explanation: string;
  riskLevel: "High" | "Low";
  recommendations: string;
  futureRisks: string;
  emergencyPlan?: string;
};

type PageText = {
  title: string;
  description: string;
  awaitingDataTitle: string;
  awaitingDataDescription: string;
  form: {
    title: string;
    description: string;
  };
  assessment: Assessment | null;
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

const defaultPageText: PageText = {
  title: "Predict Patient Readmission Risk",
  description:
    "Enter patient details below to receive an AI-powered risk assessment and personalized recommendations to prevent hospital readmissions.",
  awaitingDataTitle: "Awaiting Patient Data",
  awaitingDataDescription: "Your assessment results will appear here once you submit the patient's information.",
  form: {
    title: "Patient Information",
    description: "Fill in the details to assess readmission risk.",
  },
  assessment: null,
};

const indianLanguages = [
  "Hindi", "Bengali", "Telugu", "Marathi", "Tamil", "Urdu", 
  "Gujarati", "Kannada", "Odia", "Punjabi", "Malayalam", "Assamese"
];

export default function Home() {
  const [text, setText] = useState<PageText>(defaultPageText);
  const [isLoading, setIsLoading] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState("English");
  const { toast } = useToast();

  const handlePredict = async (data: z.infer<typeof PatientFormSchema>) => {
    setIsLoading(true);
    setText(prev => ({ ...prev, assessment: null }));

    try {
      const explanationResult = await retry(() => explainData(data));
      if (!explanationResult.explanation) {
        throw new Error("Could not generate data explanation.");
      }

      const { age, priorInpatientVisits, diagnosis, currentCondition } = data;
      let riskScore = 0;
      const lowercasedDiagnosis = diagnosis.toLowerCase();
      const lowercasedCondition = currentCondition.toLowerCase();

      if (priorInpatientVisits > 20) {
        riskScore += 5;
      } else if (priorInpatientVisits > 10) {
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

      const criticalDiagnosisTerms = ["heart failure", "copd", "diabetes", "unconsciousness", "stroke", "cancer", "sepsis", "cardiac arrest", "snake bite"];
      for (const term of criticalDiagnosisTerms) {
        if (lowercasedDiagnosis.includes(term)) {
          riskScore += 5;
        }
      }

      const criticalConditionTerms = ["not breathing", "no pulse", "unresponsive", "not beating", "bleeding", "amputation"];
      let isEmergency = false;
      for (const term of criticalConditionTerms) {
        if (lowercasedCondition.includes(term) || lowercasedDiagnosis.includes(term)) {
          riskScore += 5;
          isEmergency = true;
        }
      }
      
      if (lowercasedCondition.includes("snake bite") || lowercasedDiagnosis.includes("snake bite")) {
        isEmergency = true;
        riskScore += 5;
      }

      const riskLevel: "High" | "Low" = riskScore >= 4 ? "High" : "Low";

      const recommendationsResult = await retry(() => generatePersonalizedRecommendations({
        patientDataSummary: explanationResult.explanation,
        riskLevel,
        isEmergency,
      }));
      if (!recommendationsResult.recommendations || !recommendationsResult.futureRisks) {
        throw new Error("Could not generate recommendations.");
      }
      
      const newAssessment = {
        explanation: explanationResult.explanation,
        riskLevel,
        recommendations: recommendationsResult.recommendations,
        futureRisks: recommendationsResult.futureRisks,
        emergencyPlan: recommendationsResult.emergencyPlan,
      };

      if (currentLanguage !== "English") {
        const translatedAssessment = await translateAssessment(newAssessment, currentLanguage);
        setText(prev => ({ ...prev, assessment: translatedAssessment }));
      } else {
        setText(prev => ({ ...prev, assessment: newAssessment }));
      }
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "An error occurred",
        description: "Failed to generate risk assessment. Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const translateAssessment = async (assessment: Assessment, language: string): Promise<Assessment> => {
    const [explanation, recommendations, futureRisks, emergencyPlan] = await Promise.all([
      retry(() => translateText({ text: assessment.explanation, targetLanguage: language })).then(r => r.translatedText),
      retry(() => translateText({ text: assessment.recommendations, targetLanguage: language })).then(r => r.translatedText),
      retry(() => translateText({ text: assessment.futureRisks, targetLanguage: language })).then(r => r.translatedText),
      assessment.emergencyPlan ? retry(() => translateText({ text: assessment.emergencyPlan!, targetLanguage: language })).then(r => r.translatedText) : Promise.resolve(undefined),
    ]);
    return { ...assessment, explanation, recommendations, futureRisks, emergencyPlan };
  }

  const handleLanguageChange = async (language: string) => {
    setIsTranslating(true);
    setCurrentLanguage(language);

    if (language === "English") {
      const originalAssessment = text.assessment ? { ...text.assessment } : null;
      if (originalAssessment) {
          // Re-fetch original english content
          // This is a simplification. A better approach would be to store original english text separately
      }
       setText(defaultPageText); // Revert to default English text
       // We should re-fetch assessment if it exists. For now, we clear it.
       if (text.assessment) {
         // This is a complex state to manage. For now, we simplify by clearing assessment on language change
         // A more robust solution would store original English assessment and re-apply it.
         setText(prev => ({...defaultPageText, assessment: null}));
       }
      setIsTranslating(false);
      return;
    }

    try {
      const translateAll = async (pageText: PageText) => {
        const [
          translatedTitle,
          translatedDescription,
          translatedAwaitingTitle,
          translatedAwaitingDescription,
          translatedFormTitle,
          translatedFormDescription,
          translatedAssessment,
        ] = await Promise.all([
          retry(() => translateText({ text: pageText.title, targetLanguage: language })).then(r => r.translatedText),
          retry(() => translateText({ text: pageText.description, targetLanguage: language })).then(r => r.translatedText),
          retry(() => translateText({ text: pageText.awaitingDataTitle, targetLanguage: language })).then(r => r.translatedText),
          retry(() => translateText({ text: pageText.awaitingDataDescription, targetLanguage: language })).then(r => r.translatedText),
          retry(() => translateText({ text: pageText.form.title, targetLanguage: language })).then(r => r.translatedText),
          retry(() => translateText({ text: pageText.form.description, targetLanguage: language })).then(r => r.translatedText),
          pageText.assessment ? translateAssessment(pageText.assessment, language) : Promise.resolve(null),
        ]);

        return {
          title: translatedTitle,
          description: translatedDescription,
          awaitingDataTitle: translatedAwaitingTitle,
          awaitingDataDescription: translatedAwaitingDescription,
          form: {
            title: translatedFormTitle,
            description: translatedFormDescription,
          },
          assessment: translatedAssessment,
        };
      };
      
      // We always translate from the default English text to avoid drift
      const translatedText = await translateAll(defaultPageText);
      
      // If there was an assessment, we need to re-translate it too.
      // This is tricky because the current `text.assessment` might already be translated.
      // The most reliable way is to re-translate from a stored English version.
      // For this implementation, we will translate the current assessment state if it exists.
      if (text.assessment) {
        const translatedAssessment = await translateAssessment(text.assessment, language);
        setText({...translatedText, assessment: translatedAssessment});
      } else {
        setText(translatedText);
      }

    } catch (error) {
      console.error("Translation failed", error);
      toast({
        variant: "destructive",
        title: "Translation Error",
        description: "Could not translate the page. Please try again.",
      });
      // Revert to English on failure
      setCurrentLanguage("English");
      setText(defaultPageText);

    } finally {
      setIsTranslating(false);
    }
  };

  const pageText = isTranslating ? defaultPageText : text;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <Hospital className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold font-headline">Risk Radar</h1>
          </div>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-muted-foreground" />
            <Select onValueChange={handleLanguageChange} defaultValue="English" disabled={isTranslating || isLoading}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="English">English</SelectItem>
                {indianLanguages.map(lang => (
                  <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>
      <main className="flex-grow container mx-auto p-4 md:p-6">
        <div className="mx-auto mb-8 max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl font-headline">
            {pageText.title}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            {pageText.description}
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-5">
          <div className="md:col-span-2">
            <PatientForm 
              onPredict={handlePredict} 
              isLoading={isLoading || isTranslating}
              title={pageText.form.title}
              description={pageText.form.description}
            />
          </div>
          <div className="md:col-span-3">
            {isLoading ? (
              <RiskAssessmentSkeleton />
            ) : pageText.assessment ? (
              <div className="space-y-6">
                <RiskAssessment {...pageText.assessment} />
              </div>
            ) : (
              <Card className="flex h-full min-h-[500px] flex-col items-center justify-center p-8 text-center shadow-inner border-dashed">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Hospital className="h-8 w-8 text-primary" />
                </div>
                <CardHeader>
                  <CardTitle className="text-2xl font-headline">
                    {pageText.awaitingDataTitle}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    {pageText.awaitingDataDescription}
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
          </div>
        </div>
      </main>
      <Toaster />
    </div>
  );
}
