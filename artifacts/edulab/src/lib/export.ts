import * as XLSX from "xlsx";

export interface ExportRow {
  studentName: string;
  groupMembers?: string[];
  grade: number | null;
  percentage: number | null;
  status: string;
  feedback?: string;
}

export function exportToExcel(activityName: string, rows: ExportRow[]): void {
  const data = rows.map((r) => ({
    "Estudiante": r.studentName,
    "Integrantes del Grupo": r.groupMembers?.join(", ") ?? "",
    "Nota (1-5)": r.grade ?? "Sin evaluar",
    "Porcentaje (%)": r.percentage ?? "",
    "Estado": r.status === "evaluado" ? "Evaluado" : "Pendiente",
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Notas");

  const colWidths = [
    { wch: 30 },
    { wch: 40 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
  ];
  ws["!cols"] = colWidths;

  XLSX.writeFile(wb, `EduLab_${activityName}_Notas.xlsx`);
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

export async function exportToPDF(
  activityName: string,
  subject: string,
  rows: ExportRow[]
): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "landscape" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;

  const drawHeader = () => {
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageW, 40, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("EduLab", margin, 18);
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Reporte de Evaluación: ${activityName}`, margin, 28);
    doc.setFontSize(10);
    doc.text(`Materia: ${subject}   |   Fecha: ${new Date().toLocaleDateString("es-CO")}`, margin, 36);
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
    startY: 50,
    head: [["Estudiante", "Compañeros de Grupo", "Nota (1-5)", "Porcentaje", "Estado"]],
    body: tableRows,
    theme: "grid",
    headStyles: {
      fillColor: [99, 102, 241],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    styles: {
      fontSize: 10,
      cellPadding: 4,
    },
    columnStyles: {
      2: { halign: "center" },
      3: { halign: "center" },
      4: { halign: "center" },
    },
  });

  const evaluatedRows = rows.filter((r) => r.feedback && r.feedback.trim());
  if (evaluatedRows.length === 0) {
    doc.save(`EduLab_${activityName}_Reporte.pdf`);
    return;
  }

  doc.addPage();
  drawHeader();

  let y = 50;

  doc.setTextColor(60, 60, 60);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Retroalimentación Individual", margin, y);
  y += 10;

  for (const row of evaluatedRows) {
    const feedbackText = stripMarkdown(row.feedback ?? "");
    const nameLines = [`${row.studentName}  —  Nota: ${row.grade?.toFixed(1) ?? "—"}  (${row.percentage ?? "—"}%)`];
    const bodyLines = doc.splitTextToSize(feedbackText, pageW - margin * 2 - 4);
    const blockH = 8 + bodyLines.length * 4.5 + 6;

    if (y + blockH > pageH - 20) {
      doc.addPage();
      drawHeader();
      y = 50;
    }

    doc.setFillColor(99, 102, 241);
    doc.roundedRect(margin, y, pageW - margin * 2, 8, 1, 1, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(nameLines[0], margin + 3, y + 5.5);
    y += 10;

    doc.setFillColor(248, 250, 252);
    doc.rect(margin, y, pageW - margin * 2, bodyLines.length * 4.5 + 4, "F");
    doc.setTextColor(50, 50, 50);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(bodyLines, margin + 3, y + 4);
    y += bodyLines.length * 4.5 + 10;
  }

  doc.save(`EduLab_${activityName}_Reporte.pdf`);
}
