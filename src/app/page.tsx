import { CircleCheck, CircleHelp, CircleX, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Halaman sementara Fasa 0. Wizard dan katalog dibina dalam Fasa 1–5.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:py-12">
      <header className="flex flex-col gap-2">
        <p className="text-muted-foreground">Musim 1448H / 2027M</p>
        <h1 className="text-3xl font-semibold sm:text-4xl">Perancang Pakej Haji PJH</h1>
        <p className="max-w-[70ch] text-lg">
          Bandingkan varian pakej Pengelola Jemaah Haji mengikut bajet, susunan bilik, Aziziyah,
          tempoh perjalanan dan Tarwiyah, berserta sumber bagi setiap maklumat.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Dalam pembinaan</CardTitle>
          <CardDescription>
            Aplikasi ini belum menilai sebarang pakej. Katalog akan terhad kepada data yang telah
            disemak daripada sumber, dan liputannya akan dipaparkan di sini.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <h2 className="mb-2 text-base font-semibold">Status keperluan yang akan digunakan</h2>
          <ul className="flex flex-wrap gap-2">
            <li>
              <Badge variant="ok">
                <CircleCheck aria-hidden="true" />
                Memenuhi
              </Badge>
            </li>
            <li>
              <Badge variant="cond">
                <TriangleAlert aria-hidden="true" />
                Bersyarat
              </Badge>
            </li>
            <li>
              <Badge variant="verify">
                <CircleHelp aria-hidden="true" />
                Perlu pengesahan
              </Badge>
            </li>
            <li>
              <Badge variant="fail">
                <CircleX aria-hidden="true" />
                Tidak memenuhi
              </Badge>
            </li>
          </ul>
        </CardContent>
      </Card>
    </main>
  );
}
