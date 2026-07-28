const fs = require('fs');
const file = 'src/app/dashboard/rapor-giris/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const weeklyStart = content.indexOf('        {/* WEEKLY FIELDS */}');
const annualStart = content.indexOf('        {/* ANNUAL FIELDS */}');

if (weeklyStart !== -1 && annualStart !== -1) {
  const afterAnnualStr = '        <div className="flex justify-end pt-4 pb-12">';
  const annualEnd = content.indexOf(afterAnnualStr, annualStart);
  
  if (annualEnd !== -1) {
    const beforeWeekly = content.substring(0, weeklyStart);
    const weeklyContent = content.substring(weeklyStart, annualStart);
    const annualContent = content.substring(annualStart, annualEnd);
    const afterAnnual = content.substring(annualEnd);

    fs.writeFileSync(file, beforeWeekly + annualContent + weeklyContent + afterAnnual);
    console.log('Reordered successfully.');
  } else {
    console.log('Could not find annualEnd.');
  }
} else {
  console.log('Could not find markers.');
}
