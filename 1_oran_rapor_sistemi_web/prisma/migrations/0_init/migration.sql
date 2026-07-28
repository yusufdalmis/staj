-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'APPROVED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "unit" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "isAnnual" BOOLEAN NOT NULL DEFAULT false,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkProgram" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "unit" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkProgramActivity" (
    "id" TEXT NOT NULL,
    "workProgramId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relatedGoal" TEXT,
    "responsibleUnit" TEXT,
    "supportUnit" TEXT,
    "stakeholders" TEXT[],
    "type" TEXT,
    "budgetCode" TEXT,
    "plannedMonths" INTEGER[],
    "performanceIndicator" TEXT,
    "resultIndicator" TEXT,
    "measurementUnit" TEXT,
    "target" TEXT,
    "verificationSource" TEXT,

    CONSTRAINT "WorkProgramActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyActivity" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "title" TEXT,
    "projectRefNo" TEXT,
    "programType" TEXT,
    "description" TEXT NOT NULL,
    "stakeholders" TEXT[],
    "status" TEXT,
    "nextStep" TEXT,
    "photo1" TEXT,
    "photo2" TEXT,

    CONSTRAINT "WeeklyActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnualDetails" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "sopName" TEXT NOT NULL,
    "sopRefNo" TEXT,
    "reportPeriod" TEXT,
    "budget" DOUBLE PRECISION,
    "sopDuration" TEXT,
    "sopSummary" TEXT,

    CONSTRAINT "AnnualDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComponentTracking" (
    "id" TEXT NOT NULL,
    "annualDetailsId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "componentName" TEXT,
    "status" TEXT,
    "delayReason" TEXT,
    "progress" TEXT,
    "nextPeriodPlan" TEXT,

    CONSTRAINT "ComponentTracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResultIndicator" (
    "id" TEXT NOT NULL,
    "annualDetailsId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT,
    "initialValue" TEXT,
    "target" TEXT,
    "periodValue" TEXT,
    "relatedGoal" TEXT,
    "targetPeriod" TEXT,

    CONSTRAINT "ResultIndicator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutputIndicator" (
    "id" TEXT NOT NULL,
    "annualDetailsId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "componentCode" TEXT,
    "unit" TEXT,
    "target" TEXT,
    "periodValue" TEXT,
    "targetPeriod" TEXT,

    CONSTRAINT "OutputIndicator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "annualDetailsId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "componentCode" TEXT,
    "plannedDate" TEXT,
    "actualDate" TEXT,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evaluation" (
    "id" TEXT NOT NULL,
    "annualDetailsId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "Evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImprovementSuggestion" (
    "id" TEXT NOT NULL,
    "annualDetailsId" TEXT NOT NULL,
    "lessonLearned" TEXT NOT NULL,
    "suggestion" TEXT NOT NULL,
    "relatedSopArea" TEXT NOT NULL,

    CONSTRAINT "ImprovementSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialData" (
    "id" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "genelHesap" DOUBLE PRECISION NOT NULL,
    "ozelHesap" DOUBLE PRECISION NOT NULL,
    "kopSartliBagis" DOUBLE PRECISION,
    "sogepHesap" DOUBLE PRECISION,
    "cmdpHesap" DOUBLE PRECISION,
    "uretenSehirler" DOUBLE PRECISION,
    "sogreenHesap" DOUBLE PRECISION,
    "abProjeHesap" DOUBLE PRECISION,
    "toplamGelir" DOUBLE PRECISION,
    "toplamGider" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AnnualDetails_reportId_key" ON "AnnualDetails"("reportId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialData_weekNumber_year_key" ON "FinancialData"("weekNumber", "year");

-- AddForeignKey
ALTER TABLE "SystemLog" ADD CONSTRAINT "SystemLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkProgram" ADD CONSTRAINT "WorkProgram_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkProgramActivity" ADD CONSTRAINT "WorkProgramActivity_workProgramId_fkey" FOREIGN KEY ("workProgramId") REFERENCES "WorkProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyActivity" ADD CONSTRAINT "WeeklyActivity_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnualDetails" ADD CONSTRAINT "AnnualDetails_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComponentTracking" ADD CONSTRAINT "ComponentTracking_annualDetailsId_fkey" FOREIGN KEY ("annualDetailsId") REFERENCES "AnnualDetails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultIndicator" ADD CONSTRAINT "ResultIndicator_annualDetailsId_fkey" FOREIGN KEY ("annualDetailsId") REFERENCES "AnnualDetails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutputIndicator" ADD CONSTRAINT "OutputIndicator_annualDetailsId_fkey" FOREIGN KEY ("annualDetailsId") REFERENCES "AnnualDetails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_annualDetailsId_fkey" FOREIGN KEY ("annualDetailsId") REFERENCES "AnnualDetails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_annualDetailsId_fkey" FOREIGN KEY ("annualDetailsId") REFERENCES "AnnualDetails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImprovementSuggestion" ADD CONSTRAINT "ImprovementSuggestion_annualDetailsId_fkey" FOREIGN KEY ("annualDetailsId") REFERENCES "AnnualDetails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

