import * as XLSX from "xlsx";
import { getInstitutionInfo } from "@/pages/SettingsPage";

export interface ExportRow {
  studentName: string;
  groupMembers?: string[];
  grade: number | null;
  percentage: number | null;
  status: string;
  feedback?: string;
}

export function exportToExcel(activityName: string, rows: ExportRow[], groupName?: string): void {
  const data = rows.map((r) => ({
    "Estudiante": r.studentName,
    "Integrantes del Grupo": r.groupMembers?.join(", ") ?? "",
    "Nota (1-5)": r.grade ?? "Sin evaluar",
    "Porcentaje (%)": r.percentage ?? "",
    "Estado": r.status === "evaluado" ? "Evaluado" : "Pendiente",
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  const sheetName = groupName ? `Notas ${groupName}` : "Notas";
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const colWidths = [{ wch: 30 }, { wch: 40 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
  ws["!cols"] = colWidths;

  const filename = groupName
    ? `EduLab_${activityName}_${groupName}_Notas.xlsx`
    : `EduLab_${activityName}_Notas.xlsx`;
  XLSX.writeFile(wb, filename);
}

function stripMarkdown(md: string): string {
  return md
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "• ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function exportToPDF(
  activityName: string,
  subject: string,
  rows: ExportRow[],
  groupName?: string
): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const inst = getInstitutionInfo();

  const doc = new jsPDF({ orientation: "landscape" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;

  let logoBase64: string | null = null;
  if (inst.logoUrl) {
    logoBase64 = await loadImageAsBase64(inst.logoUrl);
  }

  const headerH = 52;

  const drawHeader = () => {
    doc.setFillColor(10, 15, 30);
    doc.rect(0, 0, pageW, headerH, "F");

    doc.setFillColor(99, 102, 241);
    doc.rect(0, headerH - 3, pageW, 3, "F");

    let textX = margin;
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, "PNG", margin, 8, 34, 34);
        textX = margin + 40;
      } catch {
      }
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    doc.text(inst.name, textX, 18);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(180, 180, 200);
    if (inst.address) doc.text(inst.address, textX, 26);
    if (inst.city) doc.text(inst.city, textX, 32);

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(230, 230, 255);
    const titleParts = [`Reporte: ${activityName}`];
    if (groupName) titleParts.push(`Grupo: ${groupName}`);
    doc.text(titleParts.join("   |   "), textX, 43);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 170);
    doc.text(
      `Materia: ${subject}   |   Fecha: ${new Date().toLocaleDateString("es-CO")}`,
      pageW - margin,
      43,
      { align: "right" }
    );
  };

  drawHeader();

  const tableRows: (string | number)[][] = [];

  for (const row of rows) {
    if (row.groupMembers && row.groupMembers.length > 0) {
      const allMembers = [row.studentName, ...row.groupMembers];
      for (const member of allMembers) {
        tableRows.push([
          member,
          allMembers.filter((m) => m !== member).join(", ") || "-",
          row.grade !== null ? row.grade.toFixed(1) : "Sin evaluar",
          row.percentage !== null ? `${row.percentage}%` : "",
          row.status === "evaluado" ? "Evaluado" : "Pendiente",
        ]);
      }
    } else {
      tableRows.push([
        row.studentName,
        "-",
        row.grade !== null ? row.grade.toFixed(1) : "Sin evaluar",
        row.percentage !== null ? `${row.percentage}%` : "",
        row.status === "evaluado" ? "Evaluado" : "Pendiente",
      ]);
    }
  }

  tableRows.sort((a, b) => String(a[0]).localeCompare(String(b[0])));

  autoTable(doc, {
    startY: headerH + 6,
    head: [["Estudiante", "Compañeros de Grupo", "Nota (1-5)", "Porcentaje", "Estado"]],
    body: tableRows,
    theme: "grid",
    headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: { 2: { halign: "center" }, 3: { halign: "center" }, 4: { halign: "center" } },
    didDrawPage: () => {
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.setFont("helvetica", "normal");
      doc.text(
        `${inst.name} — EduLab`,
        pageW / 2,
        pageH - 6,
        { align: "center" }
      );
    },
  });

  const evaluatedRows = rows.filter((r) => r.feedback?.trim());
  if (evaluatedRows.length > 0) {
    doc.addPage();
    drawHeader();

    let y = headerH + 10;

    doc.setTextColor(60, 60, 60);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Retroalimentación Individual", margin, y);
    y += 10;

    for (const row of evaluatedRows) {
      const feedbackText = stripMarkdown(row.feedback ?? "");
      const nameLabel = `${row.studentName}  —  Nota: ${row.grade?.toFixed(1) ?? "—"}  (${row.percentage ?? "—"}%)`;
      const bodyLines = doc.splitTextToSize(feedbackText, pageW - margin * 2 - 4);
      const blockH = 10 + bodyLines.length * 4.5 + 8;

      if (y + blockH > pageH - 16) {
        doc.addPage();
        drawHeader();
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`${inst.name} — EduLab`, pageW / 2, pageH - 6, { align: "center" });
        y = headerH + 10;
      }

      doc.setFillColor(99, 102, 241);
      doc.roundedRect(margin, y, pageW - margin * 2, 9, 1, 1, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(nameLabel, margin + 3, y + 6);
      y += 11;

      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, pageW - margin * 2, bodyLines.length * 4.5 + 4, "F");
      doc.setTextColor(50, 50, 50);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(bodyLines, margin + 3, y + 4);
      y += bodyLines.length * 4.5 + 10;
    }

    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`${inst.name} — EduLab`, pageW / 2, pageH - 6, { align: "center" });
  }

  const filename = groupName
    ? `EduLab_${activityName}_${groupName}_Reporte.pdf`
    : `EduLab_${activityName}_Reporte.pdf`;
  doc.save(filename);
}
