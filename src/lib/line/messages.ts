import type { FlexContainer, FlexComponent } from "@line/bot-sdk";
import type { Booking } from "@/types";
import { formatThaiDate } from "@/lib/utils/formatThaiDate";

function getBookingBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;
  if (url) return url.startsWith("http") ? url : `https://${url}`;
  return "https://example.com";
}

export function buildWelcomeMessage(tenantName: string): FlexContainer {
  return {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: `ยินดีต้อนรับสู่ ${tenantName}`,
          weight: "bold",
          size: "xl",
          wrap: true,
        },
        {
          type: "text",
          text: "พิมพ์ \"จอง\" เพื่อเริ่มต้นการจองคิว",
          size: "md",
          wrap: true,
          margin: "md",
        },
      ],
    },
  };
}

export function buildBookingConfirmMessage(booking: {
  id: string;
  date: string;
  startTime: string;
  serviceName: string;
  staffName: string;
}): FlexContainer {
  return {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: "ยืนยันการจอง",
          weight: "bold",
          size: "xl",
          wrap: true,
        },
        {
          type: "text",
          text: `วันที่: ${booking.date}\nเวลา: ${booking.startTime}\nบริการ: ${booking.serviceName}\nช่าง: ${booking.staffName}`,
          size: "md",
          wrap: true,
          margin: "md",
        },
      ],
    },
    footer: {
      type: "box",
      layout: "horizontal",
      contents: [
        {
          type: "button",
          action: {
            type: "postback",
            label: "ยืนยัน",
            data: `confirm_booking:${booking.id}`,
          },
          style: "primary",
        },
        {
          type: "button",
          action: {
            type: "postback",
            label: "เปลี่ยนเวลา",
            data: `reschedule:${booking.id}`,
          },
        },
        {
          type: "button",
          action: {
            type: "postback",
            label: "ยกเลิก",
            data: `cancel_booking:${booking.id}`,
          },
          style: "secondary",
        },
      ],
    },
  };
}

export function buildBookingSuccessMessage(booking: Booking): FlexContainer {
  return {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: "จองสำเร็จ",
          weight: "bold",
          size: "xl",
          wrap: true,
        },
        {
          type: "text",
          text: `วันที่: ${booking.date}\nเวลา: ${booking.startTime}\nบริการ: ${booking.serviceName}\nช่าง: ${booking.staffName}`,
          size: "md",
          wrap: true,
          margin: "md",
        },
      ],
    },
  };
}

export function buildBookingCancelledMessage(booking: Booking): FlexContainer {
  return {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: "ยกเลิกการจองแล้ว",
          weight: "bold",
          size: "xl",
          wrap: true,
        },
        {
          type: "text",
          text: `การจองวันที่ ${booking.date} เวลา ${booking.startTime} ถูกยกเลิกแล้ว`,
          size: "md",
          wrap: true,
          margin: "md",
        },
      ],
    },
  };
}

export function buildAdminNewBookingMessage(
  booking: { id: string; date: string; startTime: string },
  customerName: string,
  serviceName: string,
  staffName: string
): FlexContainer {
  return {
    type: "bubble",
    header: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: "การจองใหม่",
          weight: "bold",
          size: "xl",
          color: "#ffffff",
          wrap: true,
        },
      ],
      backgroundColor: "#00B900",
      paddingAll: "md",
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "ลูกค้า",
              size: "xs",
              color: "#666666",
              wrap: true,
            },
            {
              type: "text",
              text: customerName,
              size: "md",
              weight: "bold",
              wrap: true,
            },
          ],
          margin: "sm",
        },
        {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "บริการ",
              size: "xs",
              color: "#666666",
              wrap: true,
            },
            {
              type: "text",
              text: serviceName,
              size: "md",
              wrap: true,
            },
          ],
          margin: "sm",
        },
        {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "พนักงาน",
              size: "xs",
              color: "#666666",
              wrap: true,
            },
            {
              type: "text",
              text: staffName,
              size: "md",
              wrap: true,
            },
          ],
          margin: "sm",
        },
        {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "วันที่",
              size: "xs",
              color: "#666666",
              wrap: true,
            },
            {
              type: "text",
              text: `${booking.date} • ${booking.startTime}`,
              size: "md",
              wrap: true,
            },
          ],
          margin: "sm",
        },
      ],
      paddingAll: "lg",
    },
    footer: {
      type: "box",
      layout: "horizontal",
      contents: [
        {
          type: "button",
          action: {
            type: "postback",
            label: "ยืนยันการจอง",
            data: `action=confirm&bookingId=${booking.id}`,
          },
          style: "primary",
        },
        {
          type: "button",
          action: {
            type: "postback",
            label: "ปฏิเสธการจอง",
            data: `action=admin_cancel&bookingId=${booking.id}`,
          },
          style: "secondary",
        },
      ],
      paddingAll: "md",
    },
  };
}

export function buildAdminBookingCancelledByUserMessage(
  booking: { date: string; startTime: string; serviceName: string },
  customerName: string
): FlexContainer {
  return {
    type: "bubble",
    header: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: "ลูกค้ายกเลิกการจอง",
          weight: "bold",
          size: "xl",
          color: "#ffffff",
          wrap: true,
        },
      ],
      backgroundColor: "#E74C3C",
      paddingAll: "md",
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "ลูกค้า",
              size: "xs",
              color: "#666666",
              wrap: true,
            },
            {
              type: "text",
              text: customerName,
              size: "md",
              weight: "bold",
              wrap: true,
            },
          ],
          margin: "sm",
        },
        {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "บริการ",
              size: "xs",
              color: "#666666",
              wrap: true,
            },
            {
              type: "text",
              text: booking.serviceName,
              size: "md",
              wrap: true,
            },
          ],
          margin: "sm",
        },
        {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "วันที่ • เวลา",
              size: "xs",
              color: "#666666",
              wrap: true,
            },
            {
              type: "text",
              text: `${booking.date} • ${booking.startTime}`,
              size: "md",
              wrap: true,
            },
          ],
          margin: "sm",
        },
      ],
      paddingAll: "lg",
    },
  };
}

export function buildAdminBookingStatusMessage(booking: Booking): FlexContainer {
  return {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: `สถานะการจอง: ${booking.status}`,
          weight: "bold",
          size: "xl",
          wrap: true,
        },
        {
          type: "text",
          text: `ลูกค้า: ${booking.customerName}\nวันที่: ${booking.date}\nเวลา: ${booking.startTime}\nบริการ: ${booking.serviceName}`,
          size: "md",
          wrap: true,
          margin: "md",
        },
      ],
    },
  };
}

function bookingBodyRow(label: string, value: string) {
  return {
    type: "box" as const,
    layout: "vertical" as const,
    contents: [
      { type: "text" as const, text: label, size: "xs" as const, color: "#666666" as const, wrap: true },
      { type: "text" as const, text: value, size: "md" as const, wrap: true },
    ],
    margin: "sm" as const,
  };
}

export function buildBookingReceivedMessage(
  booking: Booking,
  tenantName: string
): FlexContainer {
  const base = getBookingBaseUrl();
  const dateFormatted = formatThaiDate(booking.date);
  return {
    type: "bubble",
    header: {
      type: "box",
      layout: "vertical",
      contents: [
        { type: "text", text: "ได้รับการจองแล้ว", weight: "bold", size: "xl", color: "#ffffff", wrap: true },
      ],
      backgroundColor: "#00B900",
      paddingAll: "md",
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        bookingBodyRow("บริการ", booking.serviceName),
        bookingBodyRow("พนักงาน", booking.staffId === "any" ? "ไม่ระบุ" : booking.staffName),
        bookingBodyRow("วันที่", dateFormatted),
        bookingBodyRow("เวลา", booking.startTime),
        bookingBodyRow("สถานะ", "รอการยืนยัน"),
      ],
      paddingAll: "lg",
    },
    footer: {
      type: "box",
      layout: "horizontal",
      contents: [
        {
          type: "button",
          action: { type: "uri", label: "ตรวจสอบสถานะ", uri: `${base}/booking/${booking.tenantId}/status` },
          style: "primary",
        },
        {
          type: "button",
          action: { type: "postback", label: "ยกเลิกการจอง", data: `action=user_cancel&bookingId=${booking.id}` },
          style: "secondary",
        },
      ],
      paddingAll: "md",
    },
  };
}

export function buildBookingConfirmedMessage(
  booking: Booking,
  tenantName: string
): FlexContainer {
  const base = getBookingBaseUrl();
  const dateFormatted = formatThaiDate(booking.date);
  return {
    type: "bubble",
    header: {
      type: "box",
      layout: "vertical",
      contents: [
        { type: "text", text: "ยืนยันการจองแล้ว", weight: "bold", size: "xl", color: "#ffffff", wrap: true },
      ],
      backgroundColor: "#00B900",
      paddingAll: "md",
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        bookingBodyRow("บริการ", booking.serviceName),
        bookingBodyRow("พนักงาน", booking.staffId === "any" ? "ไม่ระบุ" : booking.staffName),
        bookingBodyRow("วันที่", dateFormatted),
        bookingBodyRow("เวลา", booking.startTime),
        bookingBodyRow("สถานะ", "ยืนยันแล้ว"),
      ],
      paddingAll: "lg",
    },
    footer: {
      type: "box",
      layout: "horizontal",
      spacing: "md",
      paddingAll: "md",
      contents: [
        {
          type: "button",
          style: "primary",
          color: "#0D9488",
          height: "sm",
          flex: 1,
          action: {
            type: "postback",
            label: "เลื่อนนัด",
            data: `action=reschedule&bookingId=${booking.id}`,
          },
        },
        {
          type: "button",
          style: "secondary",
          color: "#F97373",
          height: "sm",
          flex: 1,
          action: {
            type: "postback",
            label: "ยกเลิกนัด",
            data: `action=cancel_booking&bookingId=${booking.id}`,
          },
        },
      ],
    },
  };
}

export function buildBookingCancelledByAdminMessage(
  booking: Booking,
  tenantName: string
): FlexContainer {
  const base = getBookingBaseUrl();
  const dateFormatted = formatThaiDate(booking.date);
  return {
    type: "bubble",
    header: {
      type: "box",
      layout: "vertical",
      contents: [
        { type: "text", text: "การจองถูกยกเลิก", weight: "bold", size: "xl", color: "#ffffff", wrap: true },
      ],
      backgroundColor: "#E74C3C",
      paddingAll: "md",
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        bookingBodyRow("บริการ", booking.serviceName),
        bookingBodyRow("วันที่", dateFormatted),
        bookingBodyRow("เวลา", booking.startTime),
        {
          type: "text",
          text: "ร้านได้ยกเลิกการจองของคุณ",
          size: "md",
          wrap: true,
          margin: "md",
          color: "#666666",
        },
      ],
      paddingAll: "lg",
    },
    footer: {
      type: "box",
      layout: "horizontal",
      contents: [
        {
          type: "button",
          action: { type: "uri", label: "จองใหม่", uri: `${base}/booking/${booking.tenantId}` },
          style: "primary",
        },
      ],
      paddingAll: "md",
    },
  };
}

export function buildRescheduleMessage(
  booking: Booking,
  tenantName: string
): FlexContainer {
  const base = getBookingBaseUrl();
  const dateFormatted = formatThaiDate(booking.date);
  return {
    type: "bubble",
    header: {
      type: "box",
      layout: "vertical",
      contents: [
        { type: "text", text: "เลื่อนนัดหมาย", weight: "bold", size: "xl", color: "#ffffff", wrap: true },
      ],
      backgroundColor: "#00B900",
      paddingAll: "md",
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        bookingBodyRow("การจองปัจจุบัน", `${booking.serviceName}`),
        bookingBodyRow("พนักงาน", booking.staffId === "any" ? "ไม่ระบุ" : booking.staffName),
        bookingBodyRow("วันที่", dateFormatted),
        bookingBodyRow("เวลา", booking.startTime),
      ],
      paddingAll: "lg",
    },
    footer: {
      type: "box",
      layout: "horizontal",
      contents: [
        {
          type: "button",
          action: {
            type: "uri",
            label: "เลือกวันเวลาใหม่",
            uri: `${base}/booking/${booking.tenantId}/reschedule/${booking.id}`,
          },
          style: "primary",
        },
      ],
      paddingAll: "md",
    },
  };
}

export function buildReminderMessage(
  booking: Booking,
  tenantName: string
): FlexContainer {
  const base = getBookingBaseUrl();
  const dateFormatted = formatThaiDate(booking.date);
  return {
    type: "bubble",
    header: {
      type: "box",
      layout: "vertical",
      contents: [
        { type: "text", text: "แจ้งเตือนนัดหมายพรุ่งนี้", weight: "bold", size: "xl", color: "#ffffff", wrap: true },
      ],
      backgroundColor: "#00B900",
      paddingAll: "md",
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        bookingBodyRow("บริการ", booking.serviceName),
        bookingBodyRow("พนักงาน", booking.staffId === "any" ? "ไม่ระบุ" : booking.staffName),
        bookingBodyRow("วันที่", dateFormatted),
        bookingBodyRow("เวลา", booking.startTime),
      ],
      paddingAll: "lg",
    },
    footer: {
      type: "box",
      layout: "horizontal",
      contents: [
        {
          type: "button",
          action: {
            type: "uri",
            label: "ดูรายละเอียด",
            uri: `${base}/booking/${booking.tenantId}/status`,
          },
          style: "primary",
        },
        {
          type: "button",
          action: {
            type: "postback",
            label: "ยกเลิกการจอง",
            data: `action=user_cancel&bookingId=${booking.id}`,
          },
          style: "secondary",
        },
      ],
      paddingAll: "md",
    },
  };
}

const BUSINESS_TYPE_LABELS: Record<string, string> = {
  barbershop: "ร้านตัดผม",
  beauty_salon: "ร้านเสริมสวย",
  spa: "สปา",
  thai_massage: "นวดแผนไทย",
  aesthetic_clinic: "คลินิกความงาม",
  general_clinic: "คลินิกทั่วไป",
  dental_clinic: "ทันตกรรม",
  nail_salon: "ร้านทำเล็บ",
  fitness: "ฟิตเนส",
  pilates: "โยคะ",
  other: "อื่นๆ",
};

export interface ShopInfoService {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
  depositAmount?: number;
}

export interface ShopInfoStaff {
  id: string;
  name: string;
  serviceIds: string[];
}

export function buildShopInfoMessage(
  tenant: { name: string; businessType: string; id: string },
  services: ShopInfoService[],
  staff: ShopInfoStaff[],
  options?: { followOnly?: boolean; useLinePostback?: boolean }
): FlexContainer {
  const businessLabel =
    BUSINESS_TYPE_LABELS[tenant.businessType] ?? tenant.businessType;
  const serviceNameById = Object.fromEntries(
    services.map((s) => [s.id, s.name])
  );

  const usePostback = options?.useLinePostback ?? true;

  return {
    type: "bubble",
    size: "mega",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: "#0D9488",
      paddingAll: "lg",
      contents: [
        {
          type: "text",
          text: `✨ ${tenant.name}`,
          weight: "bold",
          size: "xl",
          color: "#FFFFFF",
          wrap: true,
        },
        {
          type: "text",
          text: businessLabel,
          size: "sm",
          color: "#E0F2F1",
          margin: "sm",
          wrap: true,
        },
      ],
    },
    body: {
      type: "box",
      layout: "vertical",
      spacing: "lg",
      paddingAll: "lg",
      backgroundColor: "#FFFFFF",
      contents: [
        {
          type: "text",
          text: "💇 บริการของเรา",
          weight: "bold",
          size: "md",
          color: "#0D9488",
          wrap: true,
        },
        ...(services.length === 0
          ? [
              {
                type: "text",
                text: "ยังไม่มีบริการ",
                size: "sm",
                color: "#888888",
                wrap: true,
              } as FlexComponent,
            ]
          : (services.map((s) => ({
              type: "box",
              layout: "horizontal",
              margin: "md",
              contents: [
                {
                  type: "text",
                  text: s.name,
                  size: "sm",
                  color: "#333333",
                  flex: 5,
                  wrap: true,
                },
                {
                  type: "text",
                  text: `฿${s.price.toLocaleString()} · ${s.durationMinutes} นาที`,
                  size: "sm",
                  color: "#888888",
                  flex: 5,
                  align: "end",
                  wrap: true,
                },
              ],
            })) as FlexComponent[])),
        {
          type: "separator",
          margin: "lg",
          color: "#E5E7EB",
        },
        {
          type: "text",
          text: "👨‍💼 พนักงาน",
          weight: "bold",
          size: "md",
          color: "#0D9488",
          margin: "lg",
          wrap: true,
        },
        ...(staff.length === 0
          ? [
              {
                type: "text",
                text: "ยังไม่มีพนักงาน",
                size: "sm",
                color: "#888888",
                wrap: true,
              } as FlexComponent,
            ]
          : (staff.map((s) => {
              const serviceNames = s.serviceIds
                .map((id) => serviceNameById[id] ?? "")
                .filter(Boolean)
                .join(", ");
              return {
                type: "box",
                layout: "horizontal",
                margin: "md",
                contents: [
                  {
                    type: "text",
                    text: s.name,
                    size: "sm",
                    color: "#333333",
                    flex: 4,
                    wrap: true,
                  },
                  {
                    type: "text",
                    text: serviceNames || "-",
                    size: "xs",
                    color: "#888888",
                    flex: 6,
                    align: "end",
                    wrap: true,
                  },
                ],
              };
            }) as FlexComponent[])),
      ],
    },
    footer: {
      type: "box",
      layout: "horizontal",
      spacing: "md",
      paddingAll: "lg",
      contents: [
        {
          type: "button",
          style: "primary",
          color: "#0D9488",
          height: "md",
          flex: 2,
          action: usePostback
            ? {
                type: "uri",
                label: "📅 จองคิวเลย",
                uri: `https://liff.line.me/2009324540-weVbZ1eR?tenantId=${tenant.id}`,
              }
            : {
                type: "uri",
                label: "📅 จองคิว",
                uri: `${getBookingBaseUrl()}/booking/${tenant.id}`,
              },
        },
        {
          type: "button",
          style: "secondary",
          height: "md",
          flex: 2,
          action: usePostback
            ? {
                type: "postback",
                label: "📋 เช็คการจอง",
                data: "action=check_booking",
                displayText: "ตรวจสอบการจอง",
              }
            : {
                type: "uri",
                label: "📋 ตรวจสอบการจอง",
                uri: `${getBookingBaseUrl()}/booking/${tenant.id}/status`,
              },
        },
      ],
    },
  };
}

export function buildLineDatePickerFlex(dates: string[]): FlexContainer {
  const items = dates.slice(0, 10);
  return {
    type: "bubble",
    size: "kilo",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: "#0D9488",
      paddingAll: "lg",
      contents: [
        {
          type: "text",
          text: "📅 เลือกวันที่",
          weight: "bold",
          size: "lg",
          color: "#FFFFFF",
          wrap: true,
        },
      ],
    },
    body: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      paddingAll: "md",
      contents: items.map((date) => {
        const label = formatThaiDate(date);
        return {
          type: "button",
          style: "secondary",
          height: "sm",
          margin: "sm",
          action: {
            type: "postback",
            label,
            data: `action=select_date&date=${date}`,
            displayText: `📅 เลือกวัน: ${label}`,
          },
        } as FlexComponent;
      }),
    },
  };
}

export function buildLineRescheduleDatePickerFlex(
  bookingId: string,
  dates: string[]
): FlexContainer {
  const items = dates.slice(0, 10);
  return {
    type: "bubble",
    size: "kilo",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: "#0D9488",
      paddingAll: "lg",
      contents: [
        {
          type: "text",
          text: "📅 เลือกวันใหม่",
          weight: "bold",
          size: "lg",
          color: "#FFFFFF",
          wrap: true,
        },
      ],
    },
    body: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      paddingAll: "md",
      contents: items.map((date) => {
        const label = formatThaiDate(date);
        return {
          type: "button",
          style: "secondary",
          height: "sm",
          margin: "sm",
          action: {
            type: "postback",
            label,
            data: `action=reschedule_select_date&bookingId=${bookingId}&date=${date}`,
            displayText: `📅 เลื่อนนัดเป็นวัน: ${label}`,
          },
        } as FlexComponent;
      }),
    },
  };
}

export function buildLineServicesFlex(
  date: string,
  services: {
    id: string;
    name: string;
    durationMinutes: number;
    price: number;
    depositAmount?: number;
  }[]
): FlexContainer {
  const bubbles: FlexContainer[] = services.map((s) => {
    const depositAmount = s.depositAmount ?? 0;
    return {
      type: "bubble",
      size: "kilo",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "xl",
        contents: [
          {
            type: "text",
            text: s.name,
            weight: "bold",
            size: "lg",
            color: "#333333",
            wrap: true,
          },
          {
            type: "box",
            layout: "horizontal",
            margin: "lg",
            contents: [
              {
                type: "text",
                text: `⏱ ${s.durationMinutes} นาที`,
                size: "sm",
                color: "#888888",
                wrap: true,
              },
              {
                type: "text",
                text: `฿${s.price.toLocaleString()}`,
                size: "lg",
                weight: "bold",
                color: "#0D9488",
                align: "end",
                wrap: true,
              },
            ],
          },
          ...(depositAmount > 0
            ? ([
                {
                  type: "box",
                  layout: "horizontal",
                  margin: "md",
                  backgroundColor: "#F0FDFA",
                  cornerRadius: "md",
                  paddingAll: "sm",
                  contents: [
                    {
                      type: "text",
                      text: `💰 มัดจำ ฿${depositAmount.toLocaleString()}`,
                      size: "xs",
                      color: "#0D9488",
                      wrap: true,
                    },
                  ],
                },
              ] as FlexComponent[])
            : []),
          {
            type: "separator",
            margin: "lg",
            color: "#E5E7EB",
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        paddingAll: "md",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#0D9488",
            height: "sm",
            action: {
              type: "postback",
              label: "เลือกบริการนี้",
              data: `action=select_service&date=${date}&serviceId=${s.id}`,
              displayText: `✅ เลือก: ${s.name}`,
            },
          },
        ],
      },
    };
  });

  if (bubbles.length > 1) {
    return {
      type: "carousel",
      contents: bubbles,
    } as FlexContainer;
  }

  return bubbles[0];
}

export function buildLineStaffFlex(
  date: string,
  serviceId: string,
  staff: { id: string; name: string }[]
): FlexContainer {
  const staffBubbles = staff.map((s) => ({
    type: "bubble",
    size: "kilo",
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      paddingAll: "xl",
      justifyContent: "center",
      alignItems: "center",
      contents: [
        {
          type: "box",
          layout: "vertical",
          width: "80px",
          height: "80px",
          cornerRadius: "999px",
          backgroundColor: "#E0F2F1",
          justifyContent: "center",
          alignItems: "center",
          contents: [
            {
              type: "text",
              text: s.name.charAt(0),
              size: "xxl",
              color: "#0D9488",
              weight: "bold",
              align: "center",
              wrap: true,
            },
          ],
        },
        {
          type: "text",
          text: s.name,
          weight: "bold",
          size: "md",
          color: "#333333",
          align: "center",
          margin: "lg",
          wrap: true,
        },
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      paddingAll: "md",
      contents: [
        {
          type: "button",
          style: "primary",
          color: "#0D9488",
          height: "sm",
          action: {
            type: "postback",
            label: "เลือกช่างนี้",
            data: `action=select_staff&date=${date}&serviceId=${serviceId}&staffId=${s.id}`,
            displayText: `👨‍💼 เลือกช่าง: ${s.name}`,
          },
        },
      ],
    },
  }));

  const anyStaffBubble: FlexContainer = {
    type: "bubble",
    size: "kilo",
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      paddingAll: "xl",
      justifyContent: "center",
      alignItems: "center",
      contents: [
        {
          type: "box",
          layout: "vertical",
          width: "80px",
          height: "80px",
          cornerRadius: "999px",
          backgroundColor: "#F3F4F6",
          justifyContent: "center",
          alignItems: "center",
          contents: [
            {
              type: "text",
              text: "🎲",
              size: "xxl",
              align: "center",
              wrap: true,
            },
          ],
        },
        {
          type: "text",
          text: "ไม่ระบุช่าง",
          weight: "bold",
          size: "md",
          color: "#333333",
          align: "center",
          margin: "lg",
          wrap: true,
        },
        {
          type: "text",
          text: "ให้ร้านเลือกให้",
          size: "xs",
          color: "#888888",
          align: "center",
          wrap: true,
        },
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      paddingAll: "md",
      contents: [
        {
          type: "button",
          style: "secondary",
          height: "sm",
          action: {
            type: "postback",
            label: "ไม่ระบุช่าง",
            data: `action=select_staff&date=${date}&serviceId=${serviceId}&staffId=any`,
            displayText: "👨‍💼 ไม่ระบุช่าง",
          },
        },
      ],
    },
  };

  return {
    type: "carousel",
    contents: [anyStaffBubble, ...staffBubbles],
  } as FlexContainer;
}

export function buildLineTimeSlotsFlex(
  date: string,
  serviceId: string,
  staffId: string,
  slots: { time: string; isAvailable: boolean }[]
): FlexContainer {
  const timeRows: FlexComponent[] = [];

  for (let i = 0; i < slots.length; i += 2) {
    const rowSlots = slots.slice(i, i + 2);
    const contents: FlexComponent[] = rowSlots.map((slot) => {
      if (slot.isAvailable) {
        return {
          type: "button",
          style: "primary",
          color: "#0D9488",
          height: "sm",
          flex: 1,
          action: {
            type: "postback",
            label: slot.time,
            data: `action=select_time&date=${date}&serviceId=${serviceId}&staffId=${staffId}&time=${slot.time}`,
            displayText: `🕐 เลือกเวลา: ${slot.time}`,
          },
        };
      }
      return {
        type: "button",
        style: "secondary",
        color: "#E5E7EB",
        height: "sm",
        flex: 1,
        action: {
          type: "postback",
          label: `❌ ${slot.time}`,
          data: "action=noop",
          displayText: `❌ เวลาไม่ว่าง: ${slot.time}`,
        },
      };
    });

    if (rowSlots.length === 1) {
      contents.push({ type: "filler", flex: 1 } as any);
    }

    timeRows.push({
      type: "box",
      layout: "horizontal",
      spacing: "sm",
      margin: "sm",
      contents,
    });
  }

  return {
    type: "bubble",
    size: "mega",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: "#0D9488",
      paddingAll: "lg",
      contents: [
        {
          type: "text",
          text: "🕐 เลือกเวลา",
          weight: "bold",
          size: "lg",
          color: "#FFFFFF",
          wrap: true,
        },
      ],
    },
    body: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      paddingAll: "md",
      contents: timeRows,
    },
  };
}

export function buildLineRescheduleTimeSlotsFlex(
  bookingId: string,
  date: string,
  slots: { time: string; isAvailable: boolean }[]
): FlexContainer {
  const rows: FlexComponent[] = [];
  const available = slots.filter((s) => s.isAvailable);

  for (let i = 0; i < available.length; i += 2) {
    const rowSlots = available.slice(i, i + 2);
    const contents: FlexComponent[] = rowSlots.map((slot) => ({
      type: "button",
      style: "primary",
      color: "#0D9488",
      height: "sm",
      flex: 1,
      action: {
        type: "postback",
        label: slot.time,
        data: `action=reschedule_select_time&bookingId=${bookingId}&date=${date}&time=${slot.time}`,
        displayText: `🕐 เลื่อนนัดเป็นเวลา: ${slot.time}`,
      },
    }));
    if (rowSlots.length === 1) {
      contents.push({ type: "filler", flex: 1 } as any);
    }
    rows.push({
      type: "box",
      layout: "horizontal",
      spacing: "sm",
      margin: "sm",
      contents,
    });
  }

  return {
    type: "bubble",
    size: "mega",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: "#0D9488",
      paddingAll: "lg",
      contents: [
        {
          type: "text",
          text: "🕐 เลือกเวลาใหม่",
          weight: "bold",
          size: "lg",
          color: "#FFFFFF",
          wrap: true,
        },
      ],
    },
    body: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      paddingAll: "md",
      contents: rows.length
        ? rows
        : ([
            {
              type: "text",
              text: "ไม่มีเวลาว่างในวันนี้",
              size: "sm",
              color: "#666666",
              wrap: true,
              align: "center",
            },
          ] as FlexComponent[]),
    },
  };
}

export function buildLineBookingSummaryFlex(params: {
  date: string;
  serviceId: string;
  serviceName: string;
  staffId: string;
  staffName: string;
  time: string;
  durationMinutes: number;
  price: number;
}): FlexContainer {
  const data = `action=confirm_booking&date=${params.date}&serviceId=${params.serviceId}&staffId=${params.staffId}&time=${params.time}`;
  return {
    type: "bubble",
    header: {
      type: "box",
      layout: "vertical",
      contents: [{ type: "text", text: "สรุปการจอง", weight: "bold", size: "lg", color: "#ffffff", wrap: true }],
      backgroundColor: "#00B900",
      paddingAll: "md",
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        { type: "text", text: `วันที่: ${params.date}`, size: "md", wrap: true },
        { type: "text", text: `เวลา: ${params.time}`, size: "md", wrap: true, margin: "xs" },
        { type: "text", text: `บริการ: ${params.serviceName}`, size: "md", wrap: true, margin: "xs" },
        { type: "text", text: `พนักงาน: ${params.staffName}`, size: "md", wrap: true, margin: "xs" },
        { type: "text", text: `฿${params.price.toLocaleString()} · ${params.durationMinutes} นาที`, size: "sm", color: "#666666", wrap: true, margin: "xs" },
      ],
      paddingAll: "md",
    },
    footer: {
      type: "box",
      layout: "horizontal",
      contents: [
        { type: "button", action: { type: "postback", label: "ยืนยันการจอง", data: data }, style: "primary" },
        { type: "button", action: { type: "postback", label: "ยกเลิก", data: "action=cancel_flow" }, style: "secondary" },
      ],
      paddingAll: "md",
    },
  };
}

export function buildLineMyBookingsFlex(
  bookings: { id: string; date: string; startTime: string; serviceName: string; staffName: string }[]
): FlexContainer {
  if (bookings.length === 0) {
    return {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [{ type: "text", text: "ไม่มีนัดหมายที่กำลังจะมาถึง", size: "md", wrap: true }],
        paddingAll: "lg",
      },
    };
  }
  const bubbles = bookings.map((b) => ({
    type: "bubble" as const,
    header: {
      type: "box" as const,
      layout: "vertical" as const,
      contents: [
        { type: "text" as const, text: `${b.date} ${b.startTime}`, weight: "bold" as const, size: "sm" as const, color: "#ffffff", wrap: true },
      ],
      backgroundColor: "#00B900",
      paddingAll: "sm",
    },
    body: {
      type: "box" as const,
      layout: "vertical" as const,
      contents: [
        { type: "text" as const, text: b.serviceName, size: "md" as const, wrap: true },
        { type: "text" as const, text: b.staffName, size: "xs" as const, color: "#666666", wrap: true, margin: "xs" as const },
      ],
      paddingAll: "sm",
    },
    footer: {
      type: "box" as const,
      layout: "horizontal" as const,
      contents: [
        { type: "button" as const, action: { type: "postback" as const, label: "ยกเลิกการจอง", data: `action=cancel_booking&bookingId=${b.id}` }, style: "secondary" as const },
      ],
      paddingAll: "sm",
    },
  }));
  return { type: "carousel", contents: bubbles };
}

export function buildLineCancelConfirmFlex(bookingId: string): FlexContainer {
  return {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: "แน่ใจหรือไม่ที่จะยกเลิกนัด?\n\nกรณียกเลิกนัด คุณจะไม่ได้รับเงินมัดจำคืน",
          weight: "bold",
          size: "md",
          wrap: true,
        },
      ],
      paddingAll: "lg",
    },
    footer: {
      type: "box",
      layout: "horizontal",
      contents: [
        {
          type: "button",
          action: {
            type: "postback",
            label: "ยืนยันยกเลิกนัด",
            data: `action=cancel_booking_confirm&bookingId=${bookingId}`,
          },
          style: "secondary",
        },
        { type: "button", action: { type: "postback", label: "กลับ", data: "action=my_bookings" } },
      ],
      paddingAll: "md",
    },
  };
}
