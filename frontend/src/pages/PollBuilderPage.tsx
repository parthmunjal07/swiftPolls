import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { PollMode } from "../types";
import { ArrowLeft, GripVertical, Plus, Trash2, Rocket, Eye, Clock, UserRound } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card, CardContent } from "../components/ui/Card";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPoll } from "../api/polls";
import { formToCreatePollPayload } from "../lib/pollPayload";

// Zod validation schema
const optionSchema = z.object({
  text: z.string().min(1, "Option text is required"),
});

const questionSchema = z.object({
  title: z.string().min(1, "Question title is required"),
  is_mandatory: z.boolean().default(true),
  settings: z.object({
    show_results_live: z.boolean().default(false),
    time_limit: z.number().nullable().optional(),
  }),
  options: z.array(optionSchema).min(2, "At least 2 options required"),
});

const pollBuilderSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(50, "Title is too long"),
  description: z.string().optional(),
  mode: z.enum(["live", "async"] as const),
  /** Matches DB: true = responses need not be tied to a signed-in user (async link / guest). */
  is_anonymous: z.boolean().default(false),
  expiresAt: z.string().nullable().optional(),
  questions: z.array(questionSchema).min(1, "At least 1 question required"),
});

type PollBuilderForm = z.input<typeof pollBuilderSchema>;

export const PollBuilderPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<PollMode>("live");
  const [draftError, setDraftError] = useState<string | null>(null);

  const { control, handleSubmit, getValues, formState: { errors }, setValue } = useForm<PollBuilderForm>({
    resolver: zodResolver(pollBuilderSchema),
    defaultValues: {
      title: "",
      description: "",
      mode: "live",
      is_anonymous: false,
      questions: [
        {
          title: "",
          is_mandatory: true,
          settings: { show_results_live: true, time_limit: null },
          options: [{ text: "" }, { text: "" }],
        },
      ],
    },
  });

  const { fields: questionFields, append: appendQuestion, remove: removeQuestion } = useFieldArray({
    control,
    name: "questions",
  });

  const { mutate: publishPoll, isPending: isPublishing } = useMutation({
    mutationFn: (data: PollBuilderForm) => createPoll(formToCreatePollPayload(data, { draft: false })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["polls"] });
      navigate("/dashboard");
    },
  });

  const { mutate: saveDraftMutation, isPending: isSavingDraft } = useMutation({
    mutationFn: () => createPoll(formToCreatePollPayload(getValues(), { draft: true })),
    onSuccess: () => {
      setDraftError(null);
      queryClient.invalidateQueries({ queryKey: ["polls"] });
      navigate("/dashboard");
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string; errors?: unknown } } })?.response?.data?.message ??
        "Could not save draft. Please try again.";
      setDraftError(msg);
    },
  });

  const onSubmit = (data: PollBuilderForm) => {
    publishPoll(data);
  };

  const handleSaveDraft = () => {
    setDraftError(null);
    saveDraftMutation();
  };

  const handleModeChange = (newMode: PollMode) => {
    setMode(newMode);
    setValue("mode", newMode);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-muted/30 pb-20">
      {/* Top Navigation Bar */}
      <div className="bg-background border-b border-border sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="shrink-0 text-muted-foreground hover:text-foreground h-8 w-8 sm:h-10 sm:w-10">
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <h1 className="font-semibold text-sm sm:text-lg border-l border-border pl-2 sm:pl-4 truncate">Create New Poll</h1>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              disabled={isSavingDraft || isPublishing}
              className="text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
            >
              {isSavingDraft ? "Saving…" : "Save Draft"}
            </Button>
            <Button
              onClick={handleSubmit(onSubmit)}
              size="sm"
              className="shadow-md shadow-primary/20 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
              disabled={isPublishing || isSavingDraft}
            >
              <Rocket className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              {isPublishing ? "Publishing..." : "Publish Poll"}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Builder Area */}
      <div className="max-w-5xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {draftError && (
          <p className="mb-4 text-sm font-medium text-red-500" role="alert">
            {draftError}
          </p>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

          {/* Mode Toggle */}
          <Card className="border-border shadow-sm">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-sm">Poll Mode</h3>
                  <p className="text-sm text-muted-foreground">Choose between live interactive or async survey</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    type="button"
                    variant={mode === "live" ? "primary" : "outline"}
                    onClick={() => handleModeChange("live")}
                    className="gap-2 flex-1 sm:flex-none"
                  >
                    Live
                  </Button>
                  <Button
                    type="button"
                    variant={mode === "async" ? "primary" : "outline"}
                    onClick={() => handleModeChange("async")}
                    className="gap-2 flex-1 sm:flex-none"
                  >
                    Async
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardContent className="p-6">
              <div className="flex gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <UserRound className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1 space-y-3">
                  <div>
                    <h3 className="font-semibold text-sm">Anonymous responses</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                      For async polls: if enabled, anyone with the link can respond without an account. If disabled,
                      respondents must be signed in.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="poll-is-anonymous"
                      className="h-4 w-4 accent-primary"
                      {...control.register("is_anonymous")}
                    />
                    <label htmlFor="poll-is-anonymous" className="text-sm font-medium cursor-pointer">
                      Allow anonymous responses
                    </label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Header Info */}
          <div className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="What do you want to ask?"
                className="w-full text-2xl sm:text-4xl font-bold bg-transparent border-none outline-none placeholder:text-muted-foreground/50 focus:ring-0 px-0"
                {...control.register("title")}
              />
              {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
            </div>
            <div>
              <textarea
                placeholder="Add an optional description or context..."
                className="w-full text-base sm:text-lg bg-transparent border-none outline-none placeholder:text-muted-foreground/50 focus:ring-0 px-0 resize-none min-h-[60px]"
                {...control.register("description")}
              />
            </div>

            {/* Expiry for Async */}
            {mode === "async" && (
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Expiry Date (Optional)
                </label>
                <input
                  type="datetime-local"
                  className="w-full px-3 py-2 rounded-md border border-border bg-background"
                  {...control.register("expiresAt")}
                />
              </div>
            )}
          </div>

          {/* Questions Section */}
          <div className="space-y-6">
            {questionFields.map((field, qIndex) => (
              <QuestionBuilder
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
              onClick={() => appendQuestion({
                title: "",
                is_mandatory: true,
                settings: { show_results_live: true, time_limit: null },
                options: [{ text: "" }, { text: "" }],
              })}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Question
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface QuestionBuilderProps {
  qIndex: number;
  control: any;
  onRemove: () => void;
  canRemove: boolean;
  errors: any;
}

const QuestionBuilder: React.FC<QuestionBuilderProps> = ({
  qIndex,
  control,
  onRemove,
  canRemove,
  errors,
}) => {
  const { fields: optionFields, append: appendOption, remove: removeOption } = useFieldArray({
    control,
    name: `questions.${qIndex}.options`,
  });

  const { register } = control;

  return (
    <Card className="border-border shadow-sm">
      <div className="bg-muted/50 px-6 py-3 border-b border-border flex justify-between items-center">
        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Question {qIndex + 1}</h3>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <CardContent className="p-6 space-y-6">
        {/* Question Title */}
        <div>
          <label className="text-sm font-medium block mb-2">Question Title</label>
          <input
            type="text"
            placeholder={`Question ${qIndex + 1}`}
            className="w-full px-3 py-2 rounded-md border border-border bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            {...register(`questions.${qIndex}.title`)}
          />
          {errors.questions?.[qIndex]?.title && (
            <p className="text-red-500 text-sm mt-1">{errors.questions[qIndex].title.message}</p>
          )}
        </div>

        {/* Question Settings */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              className="w-4 h-4"
              {...register(`questions.${qIndex}.is_mandatory`)}
            />
            <label className="text-sm font-medium">Mandatory</label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              className="w-4 h-4"
              {...register(`questions.${qIndex}.settings.show_results_live`)}
            />
            <label className="text-sm font-medium flex items-center gap-1">
              <Eye className="h-4 w-4" /> Show Results Live
            </label>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Time Limit (secs)</label>
            <input
              type="number"
              placeholder="None"
              className="w-full px-3 py-2 rounded-md border border-border bg-background"
              {...register(`questions.${qIndex}.settings.time_limit`, { valueAsNumber: true })}
            />
          </div>
        </div>

        {/* Options */}
        <div className="space-y-3">
          <label className="text-sm font-medium block">Options</label>
          {optionFields.map((field, oIndex) => (
            <div key={field.id} className="flex items-center gap-3 group">
              <div className="cursor-grab text-muted-foreground/30 hover:text-muted-foreground">
                <GripVertical className="h-5 w-5" />
              </div>
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
                className={`text-muted-foreground shrink-0 transition-opacity ${optionFields.length <= 2 ? 'opacity-0 pointer-events-none' : 'opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50'}`}
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
            <Plus className="mr-2 h-3 w-3" />
            Add Option
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
