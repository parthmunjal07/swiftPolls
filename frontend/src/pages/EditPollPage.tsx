import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, GripVertical, Plus, Trash2, Save, Eye, Clock, AlertTriangle, Loader2 } from "lucide-react";
import { fetchPollById, updatePoll } from "../api/polls";
import { Button } from "../components/ui/Button";
import { Card, CardContent } from "../components/ui/Card";
import type { PollMode } from "../types";

const optionSchema = z.object({ text: z.string().min(1, "Option text is required") });
const questionSchema = z.object({
  title: z.string().min(1, "Question title is required"),
  is_mandatory: z.boolean(),
  settings: z.object({
    show_results_live: z.boolean(),
    time_limit: z.number().nullable().optional(),
  }),
  options: z.array(optionSchema).min(2, "At least 2 options required"),
});
const editPollSchema = z.object({
  title: z.string().min(1, "Poll title is required"),
  description: z.string().optional(),
  mode: z.enum(["live", "async"] as const),
  expiresAt: z.string().nullable().optional(),
  questions: z.array(questionSchema).min(1, "At least 1 question required"),
});

type EditPollForm = z.infer<typeof editPollSchema>;

export const EditPollPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [mode, setMode] = useState<PollMode>("live");
  const [blockedError, setBlockedError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const { data: poll, isLoading: isLoadingPoll } = useQuery({
    queryKey: ["poll", id],
    queryFn: () => fetchPollById(id!),
    enabled: !!id,
  });

  const { control, handleSubmit, formState: { errors }, setValue, reset } = useForm<EditPollForm>({
    resolver: zodResolver(editPollSchema),
    defaultValues: {
      title: "",
      description: "",
      mode: "live",
      questions: [{ title: "", is_mandatory: true, settings: { show_results_live: true, time_limit: null }, options: [{ text: "" }, { text: "" }] }],
    },
  });

  const { fields: questionFields, append: appendQuestion, remove: removeQuestion } = useFieldArray({ control, name: "questions" });

  // Pre-fill form once poll loads
  useEffect(() => {
    if (!poll || hasLoaded) return;
    const pollMode = (poll.mode ?? "live") as PollMode;
    setMode(pollMode);
    reset({
      title: poll.title ?? "",
      description: poll.description ?? "",
      mode: pollMode,
      expiresAt: poll.expiresAt ?? poll.expires_at ?? null,
      questions: poll.questions?.map((q) => ({
        title: q.title ?? q.body ?? "",
        is_mandatory: q.is_mandatory ?? true,
        settings: {
          show_results_live: q.settings?.show_results_live ?? false,
          time_limit: q.settings?.time_limit ?? q.settings?.time_limit_secs ?? null,
        },
        options: q.options?.map((o) => ({ text: o.text })) ?? [{ text: "" }, { text: "" }],
      })) ?? [],
    });
    setHasLoaded(true);
  }, [poll, hasLoaded, reset]);

  const { mutate: savePoll, isPending: isSaving } = useMutation({
    mutationFn: (data: EditPollForm) => updatePoll(id!, data),
    onSuccess: () => navigate("/dashboard"),
    onError: (err: any) => {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message ?? "Failed to save poll.";
      if (status === 409) {
        setBlockedError(msg);
      }
    },
  });

  const handleModeChange = (newMode: PollMode) => {
    setMode(newMode);
    setValue("mode", newMode);
  };

  const onSubmit = (data: EditPollForm) => {
    setBlockedError(null);
    savePoll(data);
  };

  if (isLoadingPoll) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-muted/30 pb-20">
      {/* Top Nav */}
      <div className="bg-background border-b border-border sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="shrink-0 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-semibold text-lg border-l border-border pl-4">Edit Poll</h1>
          </div>
          <Button onClick={handleSubmit(onSubmit as any)} className="shadow-md shadow-primary/20 gap-2" disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isSaving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Blocked error banner */}
        {blockedError && (
          <div className="mb-6 flex items-center gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-xl px-5 py-4">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-semibold text-sm">Cannot Edit Poll</p>
              <p className="text-sm mt-0.5">{blockedError}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-8">
          {/* Mode Toggle */}
          <Card className="border-border shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm">Poll Mode</h3>
                  <p className="text-sm text-muted-foreground">Choose between live interactive or async survey</p>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant={mode === "live" ? "primary" : "outline"} onClick={() => handleModeChange("live")} className="gap-2">🔴 Live</Button>
                  <Button type="button" variant={mode === "async" ? "primary" : "outline"} onClick={() => handleModeChange("async")} className="gap-2">📊 Async</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Header Info */}
          <div className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Poll title"
                className="w-full text-4xl font-bold bg-transparent border-none outline-none placeholder:text-muted-foreground/50 focus:ring-0 px-0"
                {...control.register("title")}
              />
              {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
            </div>
            <div>
              <textarea
                placeholder="Add an optional description or context..."
                className="w-full text-lg bg-transparent border-none outline-none placeholder:text-muted-foreground/50 focus:ring-0 px-0 resize-none min-h-[60px]"
                {...control.register("description")}
              />
            </div>
            {mode === "async" && (
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Expiry Date (Optional)
                </label>
                <input
                  type="datetime-local"
                  className="w-full px-3 py-2 rounded-md border border-border bg-background"
                  {...control.register("expiresAt")}
                />
              </div>
            )}
          </div>

          {/* Questions */}
          <div className="space-y-6">
            {questionFields.map((field, qIndex) => (
              <EditQuestionBuilder
                key={field.id}
                qIndex={qIndex}
                control={control}
                onRemove={() => removeQuestion(qIndex)}
                canRemove={questionFields.length > 1}
                errors={errors}
              />
            ))}
            <Button
              type="button"
              variant="outline"
              className="w-full border-dashed border-2 hover:border-primary hover:bg-primary/5 text-muted-foreground hover:text-primary transition-colors h-12"
              onClick={() => appendQuestion({ title: "", is_mandatory: true, settings: { show_results_live: true, time_limit: null }, options: [{ text: "" }, { text: "" }] })}
            >
              <Plus className="mr-2 h-4 w-4" /> Add Question
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface EditQProps { qIndex: number; control: any; onRemove: () => void; canRemove: boolean; errors: any; }
const EditQuestionBuilder: React.FC<EditQProps> = ({ qIndex, control, onRemove, canRemove, errors }) => {
  const { fields: optionFields, append: appendOption, remove: removeOption } = useFieldArray({ control, name: `questions.${qIndex}.options` });
  const { register } = control;
  return (
    <Card className="border-border shadow-sm">
      <div className="bg-muted/50 px-6 py-3 border-b border-border flex justify-between items-center">
        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Question {qIndex + 1}</h3>
        {canRemove && (
          <Button type="button" variant="ghost" size="icon" onClick={onRemove} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
      <CardContent className="p-6 space-y-6">
        <div>
          <label className="text-sm font-medium block mb-2">Question Title</label>
          <input
            type="text"
            placeholder={`Question ${qIndex + 1}`}
            className="w-full px-3 py-2 rounded-md border border-border bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            {...register(`questions.${qIndex}.title`)}
          />
          {errors.questions?.[qIndex]?.title && <p className="text-red-500 text-sm mt-1">{errors.questions[qIndex].title.message}</p>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <input type="checkbox" className="w-4 h-4" {...register(`questions.${qIndex}.is_mandatory`)} />
            <label className="text-sm font-medium">Mandatory</label>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" className="w-4 h-4" {...register(`questions.${qIndex}.settings.show_results_live`)} />
            <label className="text-sm font-medium flex items-center gap-1"><Eye className="h-4 w-4" /> Show Results Live</label>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Time Limit (secs)</label>
            <input type="number" placeholder="None" className="w-full px-3 py-2 rounded-md border border-border bg-background" {...register(`questions.${qIndex}.settings.time_limit`, { valueAsNumber: true })} />
          </div>
        </div>
        <div className="space-y-3">
          <label className="text-sm font-medium block">Options</label>
          {optionFields.map((field, oIndex) => (
            <div key={field.id} className="flex items-center gap-3 group">
              <div className="cursor-grab text-muted-foreground/30 hover:text-muted-foreground"><GripVertical className="h-5 w-5" /></div>
              <div className="flex-grow">
                <input
                  placeholder={`Option ${oIndex + 1}`}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background h-10 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  {...register(`questions.${qIndex}.options.${oIndex}.text`)}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={`text-muted-foreground shrink-0 transition-opacity ${optionFields.length <= 2 ? "opacity-0 pointer-events-none" : "opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50"}`}
                onClick={() => removeOption(oIndex)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            className="w-full border-dashed hover:border-primary hover:bg-primary/5 text-muted-foreground hover:text-primary text-sm h-9"
            onClick={() => appendOption({ text: "" })}
          >
            <Plus className="mr-2 h-3 w-3" /> Add Option
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
