import Lottie from "lottie-react";
import Link from "next/link";
import { Handle, Position, type NodeProps } from "reactflow";
import loadingJson from "~/../public/animations/loading.json";
import BalanceTotals from "~/app/components/BalanceTotals";
import { Card, CardHeader, CardTitle } from "~/app/components/ui/card";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "~/app/components/ui/hover-card";
import {
  calculateTotalAllEntities,
  capitalizeFirstLetter,
} from "~/lib/functions";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { type RouterOutputs } from "~/trpc/shared";

const TagNode = (props: NodeProps<RouterOutputs["tags"]["getAll"][number]>) => {
  const { data: balancesTag, isLoading: isLoadingTag } =
    api.movements.getBalancesByEntitiesForCard.useQuery(
      { entityTag: props.data.name },
      { refetchOnReconnect: false, staleTime: 182000 },
    );

  let totalsTag: ReturnType<typeof calculateTotalAllEntities> = [];
  if (balancesTag) {
    totalsTag = calculateTotalAllEntities(balancesTag, "daily");
  }

  return (
    <Card className={cn(`border border-${props.data.color} rounded-sm`)}>
      <Handle type="target" position={Position.Top} />
      <CardHeader>
        <HoverCard>
          <HoverCardTrigger asChild>
            <CardTitle>
              <Link
                className="flex transition-all hover:scale-110"
                href={{
                  pathname: "/cuentas",
                  query: { tag: props.data.name },
                }}
              >
                {capitalizeFirstLetter(props.data.name)}
              </Link>
            </CardTitle>
          </HoverCardTrigger>
          <HoverCardContent className="w-80">
            {!isLoadingTag ? (
              totalsTag ? (
                <BalanceTotals totals={totalsTag} />
              ) : (
                <p>No tiene movimientos</p>
              )
            ) : (
              <Lottie
                animationData={loadingJson}
                className="h-72"
                loop={true}
              />
            )}
          </HoverCardContent>
        </HoverCard>
      </CardHeader>
      <Handle type="source" position={Position.Bottom} />
    </Card>
  );
};

export default TagNode;
