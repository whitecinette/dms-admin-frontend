import React, { useEffect, useRef, useMemo, useState } from "react";
import moment from "moment";
import { Timeline } from "vis-timeline";
import { DataSet } from "vis-data";
import "vis-timeline/styles/vis-timeline-graph2d.min.css";
import "./style.scss";

const TimelineView = ({ data = [], startDay: parentStart, endDay: parentEnd, onDateChange }) => {
  const containerRef = useRef(null);
  const timelineRef = useRef(null);

  const [startDay, setStartDay] = useState(parentStart || moment().startOf("month").toDate());
  const [endDay, setEndDay] = useState(parentEnd || moment().endOf("month").toDate());

  useEffect(() => {
    if (parentStart) setStartDay(parentStart);
    if (parentEnd) setEndDay(parentEnd);
  }, [parentStart, parentEnd]);

  const handleDateChange = (newStart, newEnd) => {
    let fixedStart = newStart;
    let fixedEnd = newEnd;
    if (fixedStart && fixedEnd && fixedStart > fixedEnd) fixedEnd = fixedStart;
    setStartDay(fixedStart);
    setEndDay(fixedEnd);
    onDateChange?.(fixedStart, fixedEnd);
  };

  // 🔹 Prepare timeline data
const { groups, items } = useMemo(() => {
  const groupsArr = [];
  const itemsArr = [];

  data.forEach((asm) => {
    const doneCount = asm.done ?? 0;
    const pendingCount = asm.pending ?? 0;

    // 🔹 Group label with done/pending counts
    groupsArr.push({
    id: asm.code,
    content: `
      <div class="asm-label">
        <div class="asm-name">${asm.name || "Unnamed ASM"}</div>
        <div class="asm-stats">
          <span class="asm-chip done">
            <i class="dot"></i> Done <b>${doneCount}</b>
          </span>
          <span class="asm-chip pending">
            <i class="dot"></i> Pending <b>${pendingCount}</b>
          </span>
        </div>
      </div>
    `,
    style: "min-height: 55px;",
  });



    // 🔹 Timeline items (dealers)
    (asm.schedule || [])
      .filter((d) => d.status === "done")
      .forEach((dealer, i) => {
        const doneTime = dealer.markedDoneAt ? moment(dealer.markedDoneAt) : null;
        itemsArr.push({
          id: `${asm.code}-${i}`,
          group: asm.code,
          start: doneTime ? doneTime.toDate() : startDay,
          dealer,
        });
      });
  });

  return { groups: groupsArr, items: itemsArr };
}, [data, startDay, endDay]);


  const options = useMemo(
    () => ({
      stack: true,
      start: startDay,
      end: endDay,
      editable: false,
      zoomable: true,
      moveable: false,              // 🚫 disables drag panning
      horizontalScroll: true,       // ✅ allows natural horizontal scroll
      verticalScroll: true,         // ✅ allows vertical scroll if needed
      zoomKey: 'ctrlKey',           // ✅ zoom only when holding Ctrl (or ⌘ on Mac)
      selectable: true,
      multiselect: false,
      margin: { item: 8, axis: 5 },
      orientation: 'both',
      showCurrentTime: false,
      height: '600px',              // ✅ fixed visible area, scroll handles rest
      maxHeight: null,
      groupHeightMode: 'fixed',
      groupMinHeight: 35,

      template: (item) => {
        const d = item.dealer;
        if (!d) return '—';
        const doneTime = d.markedDoneAt ? moment(d.markedDoneAt).format('hh:mm A') : '—';

        const wrapper = document.createElement('div');
        wrapper.className = 'dealer-card compact';
        wrapper.innerHTML = `
          <div class="dealer-header">
            <span class="dealer-dot"></span>
            <span class="dealer-name">${d.name || 'Unnamed Dealer'}</span>
            <span class="dealer-chip">${d.visited || 0}</span>
          </div>
          <div class="dealer-details">
            <div>${d.code || '—'}</div>
            <div>${d.taluka || '—'}</div>
          </div>
          <div class="dealer-time">${doneTime}</div>
        `;
        return wrapper;
      },
    }),
    [startDay, endDay]
  );


  useEffect(() => {
    if (!containerRef.current) return;
    if (timelineRef.current) {
      try {
        timelineRef.current.destroy();
      } catch {}
      timelineRef.current = null;
    }
    if (items.length === 0 || groups.length === 0) return;

    try {
      const timeline = new Timeline(
        containerRef.current,
        new DataSet(items),
        new DataSet(groups),
        options
      );
      timelineRef.current = timeline;
      timeline.fit({ animation: false }); // ✅ ensures visible chart
    } catch (e) {
      console.error("Timeline init failed:", e);
    }

    return () => {
      if (timelineRef.current) {
        try {
          timelineRef.current.destroy();
        } catch {}
        timelineRef.current = null;
      }
    };
  }, [items, groups, options]);

  return (
    <div className="timeline-view">
      <div className="timeline-header">
        <h2>Market Activity Timeline</h2>
        <div className="right-tools">
          <div className="date-range">
            <div className="date">
              <label>From:</label>
              <input
                type="date"
                value={moment(startDay).format("YYYY-MM-DD")}
                max={moment(endDay).format("YYYY-MM-DD")}
                onChange={(e) => handleDateChange(new Date(e.target.value), endDay)}
              />
            </div>
            <div className="date">
              <label>To:</label>
              <input
                type="date"
                value={moment(endDay).format("YYYY-MM-DD")}
                min={moment(startDay).format("YYYY-MM-DD")}
                onChange={(e) => handleDateChange(startDay, new Date(e.target.value))}
              />
            </div>
          </div>

<button
  className="download-btn"
  onClick={() => {
    if (!data?.length) {
      alert("No data to export.");
      return;
    }

    const rows = [];
    rows.push(["ASM Code", "ASM Name", "Total", "Done", "Pending"]);

    data.forEach((asm) => {
      const schedule = asm.schedule || [];

      const doneList = schedule
        .filter((d) => d.status === "done" && d.markedDoneAt)
        .sort((a, b) => new Date(a.markedDoneAt) - new Date(b.markedDoneAt)); // ⏫ ascending by time

      const total = schedule.length;
      const done = doneList.length;
      const pending = total - done;

      // Build dealer columns (only done ones)
      const dealerCols = doneList.map((d) => {
        const dealerName = d.name || "";
        const code = d.code || "";
        const taluka = d.taluka || "";
        const doneAt = moment(d.markedDoneAt).format("YYYY-MM-DD HH:mm:ss");
        const visited = d.visited || "";
        return `${dealerName} | ${code} | ${taluka} | ${doneAt} | ${visited}`;
      });

      const row = [asm.code || "", asm.name || "", total, done, pending, ...dealerCols];
      rows.push(row);
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `MarketTimeline_${moment().format("YYYYMMDD_HHmmss")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }}
>
  Download CSV
</button>



        </div>
      </div>

      {items.length === 0 ? (
        <div className="no-data">No done dealers found for this range.</div>
      ) : (
      <div ref={containerRef} className="timeline-container"></div>




      )}
    </div>
  );
};

export default TimelineView;
