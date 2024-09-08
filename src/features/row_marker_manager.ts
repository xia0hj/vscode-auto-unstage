export class RowMarkerManager {
    rowMarkers: Map<string, Array<[number, number]>> = new Map();

    markSelectedRows({ fsPath, start, end }: { fsPath: string, start: number, end: number }) {
        const markers = this.rowMarkers.get(fsPath) ?? [];

        let isMerged = false;
        for (let i = 0; i < markers.length; i++) {
            const [curStart, curEnd] = markers[i];
            if (start <= curEnd + 1 && end >= curStart - 1) {
                markers[i][0] = Math.min(start, curStart);
                markers[i][1] = Math.max(end, curEnd);
                isMerged = true;
            }
        }
        if (!isMerged) {
            markers.push([start, end]);
        }

        markers.sort((a, b) => a[0] - b[0]);
        this.rowMarkers.set(fsPath, markers);
    }
}
