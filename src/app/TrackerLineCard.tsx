import { Card, Button, Typography, Space, Badge, Tooltip, Tag } from "antd";
import { DeleteOutlined, StopOutlined, PlayCircleOutlined } from "@ant-design/icons";
import { TrackerLine } from "../types/tracker.ts";

const { Title, Text } = Typography;

interface TrackerLineCardProps {
  line: TrackerLine;
  liveDuration?: string;
  onDelete: (line: TrackerLine) => void;
  onStop?: (line: TrackerLine) => void;
  onResume?: (line: TrackerLine) => void;
  formatDuration: (startedAt: string, endedAt: string | null) => string;
  formatTime: (dateString: string) => string;
}

export function TrackerLineCard({
  line,
  liveDuration,
  onDelete,
  onStop,
  onResume,
  formatDuration,
  formatTime,
}: TrackerLineCardProps) {
  const activeDuration = line.durations.find((d) => d.ended_at === null);
  const isActive = activeDuration !== undefined;

  // Calculate total duration across all duration entries
  const totalDuration = line.durations.reduce((total, duration) => {
    if (duration.ended_at) {
      const start = new Date(duration.started_at).getTime();
      const end = new Date(duration.ended_at).getTime();
      return total + (end - start);
    }
    return total;
  }, 0);

  const formatTotalDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return (
    <Card
      size="small"
      className={isActive ? "tracker-line-active" : ""}
      style={{
        width: "100%",
      }}
      extra={
        <Tooltip title="Delete entry">
          <Button type="text" size="small" icon={<DeleteOutlined />} onClick={() => onDelete(line)} danger />
        </Tooltip>
      }
    >
      <Space direction="vertical" style={{ width: "100%" }} size="small">
        <Space align="center">
          <Title level={5} style={{ margin: 0 }}>
            {line.desc}
          </Title>
          {isActive && <Tag color="green">Active</Tag>}
          {!isActive && line.durations.length > 0 && <Tag color="default">Stopped</Tag>}
        </Space>

        <Space direction="vertical" size="small" style={{ width: "100%" }}>
          {line.durations.length > 0 && (
            <Text type="secondary">
              Sessions: {line.durations.length} | Total: {formatTotalDuration(totalDuration)}
            </Text>
          )}

          {/* Show duration entries */}
          <Space direction="vertical" size="small" style={{ width: "100%", marginTop: 8 }}>
            {line.durations.map((duration, index) => (
              <Card
                key={duration.id}
                size="small"
                className={duration.ended_at ? "session-card-inactive" : "session-card-active"}
              >
                <Space direction="vertical" size="small" style={{ width: "100%" }}>
                  <Text type="secondary" strong>
                    Session {line.durations.length - index}
                  </Text>
                  <Space direction="vertical" size={4} style={{ width: "100%" }}>
                    <Space size={4} wrap>
                      <Text type="secondary" style={{ fontSize: "12px" }}>
                        Start:
                      </Text>
                      <Text type="secondary" style={{ fontSize: "12px" }}>
                        {formatTime(duration.started_at)}
                      </Text>
                    </Space>
                    {duration.ended_at && (
                      <Space size={4} wrap>
                        <Text type="secondary" style={{ fontSize: "12px" }}>
                          End:
                        </Text>
                        <Text type="secondary" style={{ fontSize: "12px" }}>
                          {formatTime(duration.ended_at)}
                        </Text>
                      </Space>
                    )}
                  </Space>
                  {duration.ended_at ? (
                    <Text strong>Duration: {formatDuration(duration.started_at, duration.ended_at)}</Text>
                  ) : (
                    <Space wrap>
                      <Badge status="processing" />
                      <Text strong className="active-text-pulse">
                        Live: {liveDuration || formatDuration(duration.started_at, null)}
                      </Text>
                    </Space>
                  )}
                </Space>
              </Card>
            ))}
          </Space>
        </Space>

        {/* Action buttons */}
        <Space style={{ marginTop: 8 }}>
          {isActive && onStop && (
            <Button type="primary" size="small" icon={<StopOutlined />} onClick={() => onStop(line)}>
              Stop
            </Button>
          )}
          {!isActive && onResume && (
            <Button type="default" size="small" icon={<PlayCircleOutlined />} onClick={() => onResume(line)}>
              Resume
            </Button>
          )}
        </Space>
      </Space>
    </Card>
  );
}
