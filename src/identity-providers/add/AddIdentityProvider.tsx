import React from "react";
import { useHistory, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FormProvider, useForm } from "react-hook-form";
import {
  ActionGroup,
  AlertVariant,
  Button,
  PageSection,
} from "@patternfly/react-core";

import type IdentityProviderRepresentation from "@keycloak/keycloak-admin-client/lib/defs/identityProviderRepresentation";
import { ViewHeader } from "../../components/view-header/ViewHeader";
import { toUpperCase } from "../../util";
import { FormAccess } from "../../components/form-access/FormAccess";
import { useAdminClient } from "../../context/auth/AdminClient";
import { useRealm } from "../../context/realm-context/RealmContext";
import { useAlerts } from "../../components/alert/Alerts";
import { GeneralSettings } from "./GeneralSettings";
import { toIdentityProvider } from "../routes/IdentityProvider";
import type { IdentityProviderCreateParams } from "../routes/IdentityProviderCreate";

export const AddIdentityProvider = () => {
  const { t } = useTranslation("identity-providers");
  const { providerId } = useParams<IdentityProviderCreateParams>();
  const form = useForm<IdentityProviderRepresentation>();
  const {
    handleSubmit,
    formState: { isDirty },
  } = form;

  const adminClient = useAdminClient();
  const { addAlert, addError } = useAlerts();
  const history = useHistory();
  const { realm } = useRealm();

  const save = async (provider: IdentityProviderRepresentation) => {
    try {
      await adminClient.identityProviders.create({
        ...provider,
        providerId,
        alias: providerId,
      });
      addAlert(t("createSuccess"), AlertVariant.success);
      history.push(
        toIdentityProvider({
          realm,
          providerId: providerId!,
          alias: providerId!,
          tab: "settings",
        })
      );
    } catch (error) {
      addError("identity-providers:createError", error);
    }
  };

  return (
    <>
      <ViewHeader
        titleKey={t("addIdentityProvider", {
          provider: toUpperCase(providerId!),
        })}
      />
      <PageSection variant="light">
        <FormAccess
          role="manage-identity-providers"
          isHorizontal
          onSubmit={handleSubmit(save)}
        >
          <FormProvider {...form}>
            <GeneralSettings id={providerId!} />
          </FormProvider>
          <ActionGroup>
            <Button
              isDisabled={!isDirty}
              variant="primary"
              type="submit"
              data-testid="createProvider"
            >
              {t("common:add")}
            </Button>
            <Button
              variant="link"
              data-testid="cancel"
              onClick={() => history.push(`/${realm}/identity-providers`)}
            >
              {t("common:cancel")}
            </Button>
          </ActionGroup>
        </FormAccess>
      </PageSection>
    </>
  );
};
