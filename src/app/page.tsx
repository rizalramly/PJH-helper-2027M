import { ArrowRight, CircleCheck, CircleHelp, CircleX, TriangleAlert } from "lucide-react";
import Link from "next/link";

import { CoverageNote } from "@/components/CoverageNote";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <main
      id="kandungan"
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:py-12"
    >
      <header className="flex flex-col gap-3">
        <p className="text-muted-foreground">Musim 1448H / 2027M</p>
        <h1 className="text-3xl font-semibold sm:text-4xl">Perancang Pakej Haji PJH</h1>
        <p className="max-w-[70ch] text-lg">
          Bandingkan varian pakej Pengelola Jemaah Haji mengikut bajet, susunan bilik, Aziziyah,
          tempoh perjalanan dan Tarwiyah, berserta sumber bagi setiap maklumat.
        </p>
        <Button asChild size="lg" className="self-start">
          <Link href="/nilai">
            Mula penilaian
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
        <p className="text-sm text-muted-foreground">
          Lima langkah ringkas. Tiada akaun diperlukan; pilihan disimpan pada peranti anda.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Liputan data</CardTitle>
          <CardDescription>
            Maklumat diambil daripada brosur PJH dalam kompilasi sumber. Harga, kekosongan dan
            kelulusan perlu disahkan dengan PJH sebelum membuat tempahan.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <CoverageNote />
          <div>
            <h2 className="mb-2 text-base font-semibold">Maksud status</h2>
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
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
