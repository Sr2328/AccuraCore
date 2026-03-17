import jsPDF from "jspdf";

// ── CSV Export ──────────────────────────────────────────
export function exportToCSV(filename: string, headers: string[], rows: string[][]) {
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

// ── PDF Export (no jspdf-autotable needed) ──────────────
export function exportToPDF(
  filename: string,
  title: string,
  headers: string[],
  rows: string[][],
  orientation: "portrait" | "landscape" = "portrait"
) {
  const doc = new jsPDF({ orientation });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const colWidth = (pageWidth - margin * 2) / headers.length;
  const rowHeight = 8;
  let y = 36;

  // Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(title, margin, 18);

  // Generated date
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 120);
  doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, margin, 26);
  doc.setTextColor(0, 0, 0);

  // Header row background
  doc.setFillColor(30, 30, 30);
  doc.rect(margin, y - 6, pageWidth - margin * 2, rowHeight, "F");

  // Header text
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  headers.forEach((h, i) => {
    doc.text(String(h).slice(0, 20), margin + i * colWidth + 2, y - 0.5);
  });
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  y += rowHeight;

  // Data rows
  rows.forEach((row, rowIdx) => {
    // New page if needed
    if (y > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      y = 20;
    }

    // Alternate row bg
    if (rowIdx % 2 === 0) {
      doc.setFillColor(248, 248, 248);
      doc.rect(margin, y - 6, pageWidth - margin * 2, rowHeight, "F");
    }

    doc.setFontSize(7.5);
    row.forEach((cell, i) => {
      doc.text(String(cell ?? "—").slice(0, 22), margin + i * colWidth + 2, y - 0.5);
    });

    // Row border
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y + 2, pageWidth - margin, y + 2);

    y += rowHeight;
  });

  doc.save(`${filename}.pdf`);
}